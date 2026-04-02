use crate::domain::matcher::match_students;
use crate::domain::models::{GradeActionInput, SessionSnapshot, StudentRecord};
use crate::domain::scoring::{resolve_score, ScorePolicy};
use crate::error::{AppError, AppResult};
use crate::state::SharedState;
use chrono::Utc;
use sqlx::{Row, SqlitePool};
use tauri::Emitter;
use uuid::Uuid;

pub async fn start_session(state: &SharedState, assignment_id: &str) -> AppResult<SessionSnapshot> {
    let pool = state.pool().await;
    sqlx::query("UPDATE grading_sessions SET active = 0").execute(&pool).await?;
    let session_id = Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO grading_sessions(id, assignment_id, started_at, active) VALUES(?, ?, ?, 1)",
    )
    .bind(&session_id)
    .bind(assignment_id)
    .bind(Utc::now().to_rfc3339())
    .execute(&pool)
    .await?;
    let mut active = state.0.active_session.write().await;
    active.session_id = Some(session_id);
    active.assignment_id = Some(assignment_id.into());
    active.current_student_id = None;
    active.current_question_id = None;
    active.last_action = Some("已开始批改会话".into());
    active.connection_state = "idle".into();
    active.match_state = "missing".into();
    active.match_candidates.clear();
    drop(active);
    publish_snapshot(state).await
}

pub async fn build_snapshot(state: &SharedState) -> AppResult<SessionSnapshot> {
    let pool = state.pool().await;
    let active = state.0.active_session.read().await.clone();
    let Some(assignment_id) = active.assignment_id else {
        return Ok(SessionSnapshot {
            session_id: None,
            assignment_id: None,
            assignment_title: None,
            class_name: None,
            current_student_id: None,
            current_student_name: None,
            current_question_id: None,
            current_question_label: None,
            question_index: 0,
            question_count: 0,
            graded_count: 0,
            wrong_count: 0,
            predicted_score: 0,
            current_student_completed: false,
            last_action: active.last_action,
            connection_state: active.connection_state,
            match_state: active.match_state,
            match_candidates: active.match_candidates,
        });
    };
    let assignment = sqlx::query(
        "SELECT a.title, c.name AS class_name, a.question_count, a.scoring_policy_json
         FROM assignments a JOIN classes c ON c.id = a.class_id WHERE a.id = ?",
    )
    .bind(&assignment_id)
    .fetch_one(&pool)
    .await?;
    let question_meta = if let Some(question_id) = &active.current_question_id {
        sqlx::query("SELECT label, position FROM assignment_questions WHERE id = ?")
            .bind(question_id)
            .fetch_optional(&pool)
            .await?
    } else {
        None
    };
    let current_student_name = match &active.current_student_id {
        Some(student_id) => sqlx::query_scalar::<_, String>("SELECT name FROM students WHERE id = ?")
            .bind(student_id)
            .fetch_optional(&pool)
            .await?,
        None => None,
    };
    let wrong_count = current_wrong_count(&pool, &assignment_id, active.current_student_id.as_deref()).await?;
    let graded_count = match active.current_student_id.as_deref() {
        Some(student_id) => graded_count(&pool, &assignment_id, student_id).await?,
        None => 0,
    };
    let policy: ScorePolicy =
        serde_json::from_str(&assignment.get::<String, _>("scoring_policy_json")).unwrap_or_default();
    let predicted_score = if active.current_student_id.is_some() {
        if graded_count == assignment.get::<i64, _>("question_count") {
            resolve_score(&policy, wrong_count, assignment.get::<i64, _>("question_count"))
        } else {
            resolve_score(&policy, wrong_count, assignment.get::<i64, _>("question_count"))
        }
    } else {
        0
    };
    Ok(SessionSnapshot {
        session_id: active.session_id,
        assignment_id: Some(assignment_id),
        assignment_title: Some(assignment.get("title")),
        class_name: Some(assignment.get("class_name")),
        current_student_id: active.current_student_id,
        current_student_name,
        current_question_id: active.current_question_id,
        current_question_label: question_meta.as_ref().map(|row| row.get("label")),
        question_index: question_meta.as_ref().map(|row| row.get("position")).unwrap_or(0),
        question_count: assignment.get("question_count"),
        graded_count,
        wrong_count,
        predicted_score,
        current_student_completed: graded_count > 0 && graded_count == assignment.get::<i64, _>("question_count"),
        last_action: active.last_action,
        connection_state: active.connection_state,
        match_state: active.match_state,
        match_candidates: active.match_candidates,
    })
}

pub async fn select_student(state: &SharedState, student_id: &str) -> AppResult<SessionSnapshot> {
    let pool = state.pool().await;
    let assignment_id = active_assignment_id(state).await?;
    let question_id = next_ungraded_question(&pool, &assignment_id, student_id).await?;
    sqlx::query("UPDATE grading_sessions SET current_student_id = ?, current_question_id = ? WHERE id = ?")
        .bind(student_id)
        .bind(question_id.clone())
        .bind(active_session_id(state).await?)
        .execute(&pool)
        .await?;
    let mut active = state.0.active_session.write().await;
    active.current_student_id = Some(student_id.into());
    active.current_question_id = question_id;
    active.last_action = Some("已手动切换学生".into());
    active.match_state = "matched".into();
    active.match_candidates.clear();
    drop(active);
    publish_snapshot(state).await
}

pub async fn select_question(state: &SharedState, question_key: &str) -> AppResult<SessionSnapshot> {
    let pool = state.pool().await;
    let assignment_id = active_assignment_id(state).await?;
    let question_id = resolve_question_id(&pool, &assignment_id, question_key).await?;
    sqlx::query("UPDATE grading_sessions SET current_question_id = ? WHERE id = ?")
        .bind(&question_id)
        .bind(active_session_id(state).await?)
        .execute(&pool)
        .await?;
    let mut active = state.0.active_session.write().await;
    active.current_question_id = Some(question_id);
    active.last_action = Some("已手动切换题号".into());
    drop(active);
    publish_snapshot(state).await
}

pub async fn identify_student(state: &SharedState, raw_name: &str) -> AppResult<SessionSnapshot> {
    let pool = state.pool().await;
    let assignment_id = active_assignment_id(state).await?;
    let students = roster_students(&pool, &assignment_id).await?;
    let matches = match_students(raw_name, &students);
    let session_id = active_session_id(state).await?;
    let candidates: Vec<StudentRecord> = matches.iter().map(|student| (*student).clone()).collect();
    let (match_state, current_student_id, current_question_id, last_action) = match matches.len() {
        1 => {
            let question_id = next_ungraded_question(&pool, &assignment_id, &matches[0].id).await?;
            let score = student_score(&pool, &assignment_id, &matches[0].id).await?;
            sqlx::query("UPDATE grading_sessions SET current_student_id = ?, current_question_id = ? WHERE id = ?")
                .bind(matches[0].id.clone())
                .bind(question_id.clone())
                .bind(&session_id)
                .execute(&pool)
                .await?;
            (
                "matched".to_string(),
                Some(matches[0].id.clone()),
                question_id.clone(),
                Some(if question_id.is_some() {
                    format!("已匹配学生 {}", matches[0].name)
                } else {
                    format!("{} 已完成，当前分数 {} 分", matches[0].name, score)
                }),
            )
        }
        0 => ("missing".into(), None, None, Some(format!("未找到学生 {}", raw_name))),
        _ => (
            "ambiguous".into(),
            None,
            None,
            Some(format!("学生匹配存在歧义 {}", raw_name)),
        ),
    };
    let mut active = state.0.active_session.write().await;
    active.connection_state = "connected".into();
    active.match_candidates = candidates;
    active.match_state = match_state;
    active.current_student_id = current_student_id;
    active.current_question_id = current_question_id;
    active.last_action = last_action;
    drop(active);
    publish_snapshot(state).await
}

pub async fn record_grade(state: &SharedState, input: GradeActionInput) -> AppResult<SessionSnapshot> {
    if input.action == "undo" {
        return undo_last(state).await;
    }
    let pool = state.pool().await;
    let session_id = active_session_id(state).await?;
    if let Some(client_event_id) = &input.client_event_id {
        let duplicate = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM grading_action_logs WHERE session_id = ? AND client_event_id = ?")
            .bind(&session_id)
            .bind(client_event_id)
            .fetch_one(&pool)
            .await?;
        if duplicate > 0 {
            return build_snapshot(state).await;
        }
    }
    let assignment_id = active_assignment_id(state).await?;
    let student_id = resolve_student_id(state, &pool, input.student_id, input.raw_student_name).await?;
    let question_id = match resolve_target_question(state, &pool, &assignment_id, &student_id, input.question_id).await? {
        Some(question_id) => question_id,
        None => {
            let score = student_score(&pool, &assignment_id, &student_id).await?;
            let student_name = sqlx::query_scalar::<_, String>("SELECT name FROM students WHERE id = ?")
                .bind(&student_id)
                .fetch_one(&pool)
                .await?;
            let mut active = state.0.active_session.write().await;
            active.current_student_id = Some(student_id);
            active.current_question_id = None;
            active.match_state = "matched".into();
            active.last_action = Some(format!("{} 已完成，当前分数 {} 分", student_name, score));
            drop(active);
            return publish_snapshot(state).await;
        }
    };
    let previous = sqlx::query_scalar::<_, String>(
        "SELECT status FROM assignment_student_results WHERE assignment_id = ? AND student_id = ? AND question_id = ?",
    )
    .bind(&assignment_id)
    .bind(&student_id)
    .bind(&question_id)
    .fetch_one(&pool)
    .await?;
    let new_status = if input.action == "correct" { "correct" } else { "incorrect" };
    if previous == new_status {
        let mut active = state.0.active_session.write().await;
        active.last_action = Some("重复点击已忽略".into());
        drop(active);
        return publish_snapshot(state).await;
    }
    sqlx::query("UPDATE assignment_student_results SET status = ?, updated_at = ? WHERE assignment_id = ? AND student_id = ? AND question_id = ?")
        .bind(new_status)
        .bind(Utc::now().to_rfc3339())
        .bind(&assignment_id)
        .bind(&student_id)
        .bind(&question_id)
        .execute(&pool)
        .await?;
    sqlx::query("INSERT INTO grading_action_logs(id, session_id, assignment_id, question_id, student_id, action_kind, previous_status, new_status, client_event_id, created_at, undone) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)")
        .bind(Uuid::new_v4().to_string())
        .bind(&session_id)
        .bind(&assignment_id)
        .bind(&question_id)
        .bind(&student_id)
        .bind(&input.action)
        .bind(&previous)
        .bind(new_status)
        .bind(input.client_event_id)
        .bind(Utc::now().to_rfc3339())
        .execute(&pool)
        .await?;
    let next_question = next_ungraded_question(&pool, &assignment_id, &student_id).await?;
    let student_name = sqlx::query_scalar::<_, String>("SELECT name FROM students WHERE id = ?")
        .bind(&student_id)
        .fetch_one(&pool)
        .await?;
    sqlx::query("UPDATE grading_sessions SET current_student_id = ?, current_question_id = ? WHERE id = ?")
        .bind(&student_id)
        .bind(next_question.clone())
        .bind(&session_id)
        .execute(&pool)
        .await?;
    let mut active = state.0.active_session.write().await;
    active.current_student_id = Some(student_id);
    active.current_question_id = next_question;
    active.match_state = "matched".into();
    active.last_action = Some(format!("{} -> {}", student_name, new_status));
    drop(active);
    publish_snapshot(state).await
}

pub async fn undo_last(state: &SharedState) -> AppResult<SessionSnapshot> {
    let pool = state.pool().await;
    let session_id = active_session_id(state).await?;
    let row = sqlx::query(
        "SELECT id, assignment_id, question_id, student_id, previous_status FROM grading_action_logs
         WHERE session_id = ? AND undone = 0 ORDER BY created_at DESC LIMIT 1",
    )
    .bind(&session_id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::Message("没有可撤销的操作".into()))?;
    sqlx::query("UPDATE grading_action_logs SET undone = 1 WHERE id = ?")
        .bind(row.get::<String, _>("id"))
        .execute(&pool)
        .await?;
    sqlx::query("UPDATE assignment_student_results SET status = ?, updated_at = ? WHERE assignment_id = ? AND student_id = ? AND question_id = ?")
        .bind(row.get::<String, _>("previous_status"))
        .bind(Utc::now().to_rfc3339())
        .bind(row.get::<String, _>("assignment_id"))
        .bind(row.get::<String, _>("student_id"))
        .bind(row.get::<String, _>("question_id"))
        .execute(&pool)
        .await?;
    let mut active = state.0.active_session.write().await;
    active.current_student_id = Some(row.get("student_id"));
    active.current_question_id = Some(row.get("question_id"));
    active.last_action = Some("已撤销最近一次标记".into());
    drop(active);
    publish_snapshot(state).await
}

pub async fn publish_snapshot(state: &SharedState) -> AppResult<SessionSnapshot> {
    let snapshot = build_snapshot(state).await?;
    let _ = state.0.session_sender.send(snapshot.clone());
    if let Some(handle) = state.0.app_handle.read().await.as_ref() {
        let _ = handle.emit("session-updated", &snapshot);
    }
    Ok(snapshot)
}

pub async fn set_connection_state(state: &SharedState, next: &str) -> AppResult<SessionSnapshot> {
    let mut active = state.0.active_session.write().await;
    if active.connection_state == next {
        drop(active);
        return build_snapshot(state).await;
    }
    active.connection_state = next.into();
    if next == "disconnected" {
        active.last_action = Some("扩展连接已断开".into());
    }
    drop(active);
    publish_snapshot(state).await
}

pub async fn roster_students(pool: &SqlitePool, assignment_id: &str) -> AppResult<Vec<StudentRecord>> {
    let rows = sqlx::query(
        "SELECT s.id, s.name, s.student_no, s.notes, s.created_at
         FROM students s JOIN assignment_roster ar ON ar.student_id = s.id
         WHERE ar.assignment_id = ? ORDER BY s.name",
    )
    .bind(assignment_id)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| StudentRecord {
            id: row.get("id"),
            name: row.get("name"),
            student_no: row.try_get("student_no").ok(),
            notes: row.try_get("notes").ok(),
            class_ids: vec![],
            created_at: row.get("created_at"),
        })
        .collect())
}

async fn active_assignment_id(state: &SharedState) -> AppResult<String> {
    state.0.active_session.read().await.assignment_id.clone().ok_or_else(|| AppError::Message("请先开始批改会话".into()))
}

async fn active_session_id(state: &SharedState) -> AppResult<String> {
    state.0.active_session.read().await.session_id.clone().ok_or_else(|| AppError::Message("没有活动批改会话".into()))
}

async fn resolve_student_id(
    state: &SharedState,
    _pool: &SqlitePool,
    explicit_id: Option<String>,
    raw_name: Option<String>,
) -> AppResult<String> {
    if let Some(student_id) = explicit_id {
        return Ok(student_id);
    }
    if let Some(raw_name) = raw_name {
        identify_student(state, &raw_name).await?;
    }
    state.0.active_session.read().await.current_student_id.clone().ok_or_else(|| AppError::Message("未选择学生".into()))
}

async fn resolve_target_question(
    state: &SharedState,
    pool: &SqlitePool,
    assignment_id: &str,
    student_id: &str,
    explicit_question: Option<String>,
) -> AppResult<Option<String>> {
    if let Some(question) = explicit_question {
        return resolve_question_id(pool, assignment_id, &question).await.map(Some);
    }
    if let Some(question_id) = state.0.active_session.read().await.current_question_id.clone() {
        return Ok(Some(question_id));
    }
    next_ungraded_question(pool, assignment_id, student_id).await
}

async fn resolve_question_id(pool: &SqlitePool, assignment_id: &str, key: &str) -> AppResult<String> {
    let by_id = sqlx::query_scalar::<_, String>("SELECT id FROM assignment_questions WHERE assignment_id = ? AND id = ?")
        .bind(assignment_id)
        .bind(key)
        .fetch_optional(pool)
        .await?;
    if let Some(id) = by_id {
        return Ok(id);
    }
    let position = key.parse::<i64>().unwrap_or_default();
    sqlx::query_scalar::<_, String>("SELECT id FROM assignment_questions WHERE assignment_id = ? AND position = ?")
        .bind(assignment_id)
        .bind(position)
        .fetch_one(pool)
        .await
        .map_err(Into::into)
}

async fn next_ungraded_question(pool: &SqlitePool, assignment_id: &str, student_id: &str) -> AppResult<Option<String>> {
    let row = sqlx::query_scalar::<_, String>(
        "SELECT q.id FROM assignment_questions q
         JOIN assignment_student_results r ON r.question_id = q.id
         WHERE q.assignment_id = ? AND r.student_id = ? AND r.status = 'ungraded'
         ORDER BY q.position LIMIT 1",
    )
    .bind(assignment_id)
    .bind(student_id)
    .fetch_optional(pool)
    .await?;
    Ok(row)
}

async fn current_wrong_count(pool: &SqlitePool, assignment_id: &str, student_id: Option<&str>) -> AppResult<i64> {
    match student_id {
        Some(student_id) => sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM assignment_student_results WHERE assignment_id = ? AND student_id = ? AND status = 'incorrect'",
        )
        .bind(assignment_id)
        .bind(student_id)
        .fetch_one(pool)
        .await
        .map_err(Into::into),
        None => Ok(0),
    }
}

async fn graded_count(pool: &SqlitePool, assignment_id: &str, student_id: &str) -> AppResult<i64> {
    sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM assignment_student_results WHERE assignment_id = ? AND student_id = ? AND status != 'ungraded'",
    )
    .bind(assignment_id)
    .bind(student_id)
    .fetch_one(pool)
    .await
    .map_err(Into::into)
}

async fn student_score(pool: &SqlitePool, assignment_id: &str, student_id: &str) -> AppResult<i64> {
    let wrong_count = current_wrong_count(pool, assignment_id, Some(student_id)).await?;
    let assignment = sqlx::query(
        "SELECT question_count, scoring_policy_json FROM assignments WHERE id = ?",
    )
    .bind(assignment_id)
    .fetch_one(pool)
    .await?;
    let policy: ScorePolicy =
        serde_json::from_str(&assignment.get::<String, _>("scoring_policy_json")).unwrap_or_default();
    Ok(resolve_score(
        &policy,
        wrong_count,
        assignment.get::<i64, _>("question_count"),
    ))
}
