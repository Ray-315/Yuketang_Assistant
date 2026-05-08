use crate::application::grading_service::build_snapshot;
use crate::domain::models::*;
use crate::domain::scoring::{resolve_score, ScorePolicy};
use crate::error::{AppError, AppResult};
use crate::infrastructure::import_export::read_student_rows;
use crate::state::SharedState;
use chrono::Utc;
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

pub async fn bootstrap(state: &SharedState) -> AppResult<AppBootstrap> {
    let pool = state.pool().await;
    Ok(AppBootstrap {
        classes: list_classes(&pool).await?,
        students: list_students(&pool).await?,
        assignments: list_assignments(&pool).await?,
        settings: state.0.settings.read().await.clone(),
        adapters: list_adapter_profiles(&pool).await?,
        backups: list_backups(&pool).await?,
        session: build_snapshot(state).await?,
    })
}

pub async fn list_classes(pool: &SqlitePool) -> AppResult<Vec<ClassRecord>> {
    sqlx::query_as::<_, ClassRecord>(
        "SELECT c.id, c.name, c.subject, c.notes,
            (SELECT COUNT(*) FROM class_memberships cm WHERE cm.class_id = c.id) AS student_count,
            (SELECT COUNT(*) FROM assignments a WHERE a.class_id = c.id) AS assignment_count,
            c.created_at
         FROM classes c ORDER BY c.created_at DESC",
    )
    .fetch_all(pool)
    .await
    .map_err(Into::into)
}

pub async fn list_students(pool: &SqlitePool) -> AppResult<Vec<StudentRecord>> {
    let mut students = sqlx::query_as::<_, StudentRecord>(
        "SELECT id, name, student_no, notes, created_at FROM students ORDER BY created_at DESC",
    )
    .fetch_all(pool)
    .await?;
    let memberships = sqlx::query("SELECT student_id, class_id FROM class_memberships")
        .fetch_all(pool)
        .await?;
    for student in &mut students {
        student.class_ids = memberships
            .iter()
            .filter(|row| row.get::<String, _>("student_id") == student.id)
            .map(|row| row.get::<String, _>("class_id"))
            .collect();
    }
    Ok(students)
}

pub async fn list_assignments(pool: &SqlitePool) -> AppResult<Vec<AssignmentRecord>> {
    let mut rows = sqlx::query_as::<_, AssignmentRecord>(
        "SELECT a.id, a.class_id, c.name AS class_name, a.title, a.chapter, a.question_count,
            a.roster_count, 0 AS completed_students, 0.0 AS average_score, a.created_at
         FROM assignments a JOIN classes c ON c.id = a.class_id ORDER BY a.created_at DESC",
    )
    .fetch_all(pool)
    .await?;
    for row in &mut rows {
        row.completed_students = count_completed_students(pool, &row.id).await?;
        row.average_score = assignment_average_score(pool, &row.id, row.question_count).await?;
    }
    Ok(rows)
}

pub async fn save_class(pool: &SqlitePool, input: SaveClassInput) -> AppResult<()> {
    let id = input.id.unwrap_or_else(|| Uuid::new_v4().to_string());
    let created_at = Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO classes(id, name, subject, notes, created_at) VALUES(?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, subject = excluded.subject, notes = excluded.notes",
    )
    .bind(id)
    .bind(input.name)
    .bind(input.subject)
    .bind(input.notes)
    .bind(created_at)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn delete_class(pool: &SqlitePool, id: &str) -> AppResult<()> {
    let assignments = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM assignments WHERE class_id = ?")
        .bind(id)
        .fetch_one(pool)
        .await?;
    if assignments > 0 {
        return Err(AppError::Message("该班级已有作业，不能直接删除".into()));
    }
    sqlx::query("DELETE FROM classes WHERE id = ?").bind(id).execute(pool).await?;
    Ok(())
}

pub async fn save_student(pool: &SqlitePool, input: SaveStudentInput) -> AppResult<()> {
    let student_id = input.id.unwrap_or_else(|| Uuid::new_v4().to_string());
    let created_at = Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO students(id, name, student_no, notes, created_at) VALUES(?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, student_no = excluded.student_no, notes = excluded.notes",
    )
    .bind(&student_id)
    .bind(input.name)
    .bind(input.student_no)
    .bind(input.notes)
    .bind(created_at)
    .execute(pool)
    .await?;
    sqlx::query("DELETE FROM class_memberships WHERE student_id = ?")
        .bind(&student_id)
        .execute(pool)
        .await?;
    for class_id in input.class_ids {
        sqlx::query("INSERT OR IGNORE INTO class_memberships(class_id, student_id) VALUES(?, ?)")
            .bind(class_id)
            .bind(&student_id)
            .execute(pool)
            .await?;
    }
    Ok(())
}

pub async fn delete_student(pool: &SqlitePool, id: &str) -> AppResult<()> {
    let roster_refs = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM assignment_roster WHERE student_id = ?")
        .bind(id)
        .fetch_one(pool)
        .await?;
    if roster_refs > 0 {
        return Err(AppError::Message("学生已有历史作业记录，不能删除".into()));
    }
    sqlx::query("DELETE FROM students WHERE id = ?").bind(id).execute(pool).await?;
    Ok(())
}

pub async fn import_students(pool: &SqlitePool, class_id: &str, path: &str) -> AppResult<()> {
    for row in read_student_rows(path)? {
        let existing = sqlx::query_scalar::<_, String>("SELECT id FROM students WHERE name = ? LIMIT 1")
            .bind(&row.name)
            .fetch_optional(pool)
            .await?;
        let input = SaveStudentInput {
            id: existing,
            name: row.name,
            student_no: row.student_no,
            notes: row.notes,
            class_ids: vec![class_id.into()],
        };
        save_student(pool, input).await?;
    }
    Ok(())
}

pub async fn save_assignment(pool: &SqlitePool, input: SaveAssignmentInput) -> AppResult<()> {
    if let Some(id) = input.id {
        sqlx::query("UPDATE assignments SET title = ?, chapter = ?, scoring_policy_json = ? WHERE id = ?")
            .bind(input.title)
            .bind(input.chapter)
            .bind(serde_json::to_string(&input.scoring_policy)?)
            .bind(id)
            .execute(pool)
            .await?;
        return Ok(());
    }
    let assignment_id = Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    let roster = sqlx::query("SELECT s.id, s.name, s.student_no FROM students s JOIN class_memberships cm ON cm.student_id = s.id WHERE cm.class_id = ? ORDER BY s.name")
        .bind(&input.class_id)
        .fetch_all(pool)
        .await?;
    sqlx::query("INSERT INTO assignments(id, class_id, title, chapter, question_count, roster_count, scoring_policy_json, created_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(&assignment_id)
        .bind(&input.class_id)
        .bind(&input.title)
        .bind(&input.chapter)
        .bind(input.question_labels.len() as i64)
        .bind(roster.len() as i64)
        .bind(serde_json::to_string(&input.scoring_policy)?)
        .bind(created_at)
        .execute(pool)
        .await?;
    let mut question_ids = Vec::new();
    for (index, label) in input.question_labels.iter().enumerate() {
        let question_id = Uuid::new_v4().to_string();
        question_ids.push(question_id.clone());
        sqlx::query("INSERT INTO assignment_questions(id, assignment_id, label, position) VALUES(?, ?, ?, ?)")
            .bind(&question_id)
            .bind(&assignment_id)
            .bind(label)
            .bind(index as i64 + 1)
            .execute(pool)
            .await?;
    }
    for student in roster {
        let student_id = student.get::<String, _>("id");
        sqlx::query("INSERT INTO assignment_roster(id, assignment_id, student_id, student_name, student_no) VALUES(?, ?, ?, ?, ?)")
            .bind(Uuid::new_v4().to_string())
            .bind(&assignment_id)
            .bind(&student_id)
            .bind(student.get::<String, _>("name"))
            .bind(student.try_get::<String, _>("student_no").ok())
            .execute(pool)
            .await?;
        for question_id in &question_ids {
            sqlx::query("INSERT INTO assignment_student_results(id, assignment_id, question_id, student_id, status, updated_at) VALUES(?, ?, ?, ?, 'ungraded', ?)")
                .bind(Uuid::new_v4().to_string())
                .bind(&assignment_id)
                .bind(question_id)
                .bind(&student_id)
                .bind(Utc::now().to_rfc3339())
                .execute(pool)
                .await?;
        }
    }
    Ok(())
}

pub async fn get_assignment_detail(pool: &SqlitePool, id: &str) -> AppResult<AssignmentOverview> {
    let assignment = list_assignments(pool)
        .await?
        .into_iter()
        .find(|item| item.id == id)
        .ok_or_else(|| AppError::Message("未找到作业".into()))?;
    let questions = sqlx::query_as::<_, QuestionRecord>(
        "SELECT id, label, position FROM assignment_questions WHERE assignment_id = ? ORDER BY position",
    )
    .bind(id)
    .fetch_all(pool)
    .await?;
    let score_policy: ScorePolicy = sqlx::query_scalar::<_, String>(
        "SELECT scoring_policy_json FROM assignments WHERE id = ?",
    )
    .bind(id)
    .fetch_one(pool)
    .await
    .ok()
    .and_then(|value| serde_json::from_str(&value).ok())
    .unwrap_or_default();
    let detail_rows = sqlx::query(
        "SELECT ar.student_id, ar.student_name, q.id AS question_id, q.label AS question_label, r.status
         FROM assignment_roster ar
         JOIN assignment_questions q ON q.assignment_id = ar.assignment_id
         JOIN assignment_student_results r ON r.assignment_id = ar.assignment_id AND r.student_id = ar.student_id AND r.question_id = q.id
         WHERE ar.assignment_id = ?
         ORDER BY ar.student_name, q.position",
    )
    .bind(id)
    .fetch_all(pool)
    .await?;
    let mut students = Vec::new();
    let mut cursor_student = String::new();
    let mut student_row = StudentResultRow {
        student_id: String::new(),
        student_name: String::new(),
        wrong_count: 0,
        graded_count: 0,
        score: None,
        completion_state: "ungraded".into(),
        results: Vec::new(),
    };
    for row in detail_rows {
        let student_id = row.get::<String, _>("student_id");
        if cursor_student != student_id {
            if !cursor_student.is_empty() {
                finalize_student_row(&mut student_row, &score_policy, questions.len() as i64);
                students.push(student_row);
            }
            cursor_student = student_id.clone();
            student_row = StudentResultRow {
                student_id: student_id.clone(),
                student_name: row.get("student_name"),
                wrong_count: 0,
                graded_count: 0,
                score: None,
                completion_state: "ungraded".into(),
                results: Vec::new(),
            };
        }
        let status = row.get::<String, _>("status");
        if status != "ungraded" {
            student_row.graded_count += 1;
        }
        if status == "incorrect" {
            student_row.wrong_count += 1;
        }
        student_row.results.push(StudentQuestionResult {
            question_id: row.get("question_id"),
            question_label: row.get("question_label"),
            status,
        });
    }
    if !cursor_student.is_empty() {
        finalize_student_row(&mut student_row, &score_policy, questions.len() as i64);
        students.push(student_row);
    }
    let questions_stats = sqlx::query_as::<_, QuestionStatRow>(
        "SELECT q.id AS question_id, q.label AS question_label,
            SUM(CASE WHEN r.status != 'ungraded' THEN 1 ELSE 0 END) AS graded_count,
            SUM(CASE WHEN r.status = 'correct' THEN 1 ELSE 0 END) AS correct_count,
            SUM(CASE WHEN r.status = 'incorrect' THEN 1 ELSE 0 END) AS incorrect_count,
            COALESCE(
              CAST(SUM(CASE WHEN r.status = 'correct' THEN 1 ELSE 0 END) AS REAL)
              / NULLIF(CAST(SUM(CASE WHEN r.status != 'ungraded' THEN 1 ELSE 0 END) AS REAL), 0.0),
              0.0
            ) AS correct_rate,
            COALESCE(
              CAST(SUM(CASE WHEN r.status = 'incorrect' THEN 1 ELSE 0 END) AS REAL)
              / NULLIF(CAST(SUM(CASE WHEN r.status != 'ungraded' THEN 1 ELSE 0 END) AS REAL), 0.0),
              0.0
            ) AS incorrect_rate
         FROM assignment_questions q
         JOIN assignment_student_results r ON r.question_id = q.id
         WHERE q.assignment_id = ?
         GROUP BY q.id, q.label
         ORDER BY incorrect_rate DESC, q.position",
    )
    .bind(id)
    .fetch_all(pool)
    .await?;
    let total_students = students.len() as i64;
    let completed_students: Vec<_> = students
        .iter()
        .filter(|row| row.completion_state == "completed")
        .collect();
    let averages = AssignmentAverages {
        average_wrong: if completed_students.is_empty() {
            0.0
        } else {
            completed_students.iter().map(|row| row.wrong_count).sum::<i64>() as f64 / completed_students.len() as f64
        },
        average_score: if completed_students.is_empty() {
            0.0
        } else {
            completed_students.iter().map(|row| row.score.unwrap_or(0)).sum::<i64>() as f64 / completed_students.len() as f64
        },
        full_score_count: completed_students.iter().filter(|row| row.score == Some(100)).count() as i64,
        completed_students: completed_students.len() as i64,
        total_students,
    };
    Ok(AssignmentOverview { assignment, questions, students, questions_stats, averages })
}

pub async fn save_settings(state: &SharedState, input: AppSettings) -> AppResult<()> {
    let pool = state.pool().await;
    let ui_mode = match input.ui_mode.as_str() {
        "flat" | "macos" => "flat".to_string(),
        _ => "zen".to_string(),
    };
    let mut next = input.clone();
    next.ui_mode = ui_mode.clone();
    for (key, value) in [
        ("bridge_port", next.bridge_port.to_string()),
        ("auto_backup_enabled", next.auto_backup_enabled.to_string()),
        ("backup_directory", next.backup_directory.clone()),
        ("ui_mode", ui_mode),
        ("default_score_policy", serde_json::to_string(&next.default_score_policy)?),
    ] {
        sqlx::query("INSERT INTO app_settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
            .bind(key)
            .bind(value)
            .execute(&pool)
            .await?;
    }
    *state.0.settings.write().await = next;
    Ok(())
}

pub async fn save_adapter_profile(pool: &SqlitePool, input: AdapterProfileView) -> AppResult<()> {
    sqlx::query("INSERT INTO page_adapter_profiles(id, name, host_pattern, primary_selector, fallback_selectors, anchor_texts, enabled, created_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, host_pattern = excluded.host_pattern, primary_selector = excluded.primary_selector, fallback_selectors = excluded.fallback_selectors, anchor_texts = excluded.anchor_texts, enabled = excluded.enabled")
        .bind(input.id)
        .bind(input.name)
        .bind(input.host_pattern)
        .bind(input.primary_selector)
        .bind(serde_json::to_string(&input.fallback_selectors)?)
        .bind(serde_json::to_string(&input.anchor_texts)?)
        .bind(input.enabled)
        .bind(input.created_at)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn list_adapter_profiles(pool: &SqlitePool) -> AppResult<Vec<AdapterProfileView>> {
    let rows = sqlx::query_as::<_, AdapterProfile>(
        "SELECT id, name, host_pattern, primary_selector, fallback_selectors, anchor_texts, enabled, created_at FROM page_adapter_profiles ORDER BY created_at DESC",
    )
    .fetch_all(pool)
    .await?;
    rows.into_iter()
        .map(|row| {
            Ok(AdapterProfileView {
                id: row.id,
                name: row.name,
                host_pattern: row.host_pattern,
                primary_selector: row.primary_selector,
                fallback_selectors: serde_json::from_str(&row.fallback_selectors)?,
                anchor_texts: serde_json::from_str(&row.anchor_texts)?,
                enabled: row.enabled,
                created_at: row.created_at,
            })
        })
        .collect()
}

pub async fn list_backups(pool: &SqlitePool) -> AppResult<Vec<BackupRecord>> {
    sqlx::query_as::<_, BackupRecord>(
        "SELECT id, file_path, created_at, size_bytes, note FROM backup_records ORDER BY created_at DESC",
    )
    .fetch_all(pool)
    .await
    .map_err(Into::into)
}

async fn count_completed_students(pool: &SqlitePool, assignment_id: &str) -> AppResult<i64> {
    sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM assignment_roster ar
         WHERE ar.assignment_id = ? AND NOT EXISTS (
           SELECT 1 FROM assignment_student_results r
           WHERE r.assignment_id = ar.assignment_id AND r.student_id = ar.student_id AND r.status = 'ungraded'
         )",
    )
    .bind(assignment_id)
    .fetch_one(pool)
    .await
    .map_err(Into::into)
}

async fn assignment_average_score(pool: &SqlitePool, assignment_id: &str, question_count: i64) -> AppResult<f64> {
    let policy: ScorePolicy = sqlx::query_scalar::<_, String>("SELECT scoring_policy_json FROM assignments WHERE id = ?")
        .bind(assignment_id)
        .fetch_optional(pool)
        .await?
        .and_then(|value| serde_json::from_str(&value).ok())
        .unwrap_or_default();
    let rows = sqlx::query(
        "SELECT student_id,
            SUM(CASE WHEN status = 'incorrect' THEN 1 ELSE 0 END) AS wrong_count,
            SUM(CASE WHEN status != 'ungraded' THEN 1 ELSE 0 END) AS graded_count
         FROM assignment_student_results WHERE assignment_id = ? GROUP BY student_id",
    )
    .bind(assignment_id)
    .fetch_all(pool)
    .await?;
    if rows.is_empty() {
        return Ok(0.0);
    }
    let completed: Vec<_> = rows
        .iter()
        .filter(|row| row.get::<i64, _>("graded_count") == question_count)
        .collect();
    if completed.is_empty() {
        return Ok(0.0);
    }
    let total = completed
        .iter()
        .map(|row| resolve_score(&policy, row.get::<i64, _>("wrong_count"), question_count))
        .sum::<i64>();
    Ok(total as f64 / completed.len() as f64)
}

fn finalize_student_row(student_row: &mut StudentResultRow, score_policy: &ScorePolicy, question_count: i64) {
    if student_row.graded_count == 0 {
        student_row.score = None;
        student_row.completion_state = "ungraded".into();
        return;
    }
    if student_row.graded_count < question_count {
        student_row.score = None;
        student_row.completion_state = "in_progress".into();
        return;
    }
    student_row.score = Some(resolve_score(score_policy, student_row.wrong_count, question_count));
    student_row.completion_state = "completed".into();
}
