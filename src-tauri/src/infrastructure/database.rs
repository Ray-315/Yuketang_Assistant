use crate::domain::models::AppSettings;
use crate::domain::scoring::ScorePolicy;
use crate::error::AppResult;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::path::{Path, PathBuf};
use std::str::FromStr;

pub async fn database_path() -> AppResult<PathBuf> {
    let base = dirs::data_local_dir()
        .or_else(dirs::data_dir)
        .unwrap_or_else(|| PathBuf::from("."));
    let root = base.join("grading-workbench");
    tokio::fs::create_dir_all(&root).await?;
    Ok(root.join("grading-workbench.sqlite3"))
}

pub async fn connect(path: &Path) -> AppResult<SqlitePool> {
    let url = format!("sqlite://{}", path.display());
    let options = SqliteConnectOptions::from_str(&url)?.create_if_missing(true);
    let pool = SqlitePoolOptions::new().max_connections(5).connect_with(options).await?;
    sqlx::query("PRAGMA foreign_keys = ON").execute(&pool).await?;
    migrate(&pool).await?;
    Ok(pool)
}

async fn migrate(pool: &SqlitePool) -> AppResult<()> {
    let mut conn = pool.acquire().await?;
    let statements = [
        "CREATE TABLE IF NOT EXISTS classes (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, subject TEXT, notes TEXT, created_at TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, name TEXT NOT NULL, student_no TEXT, notes TEXT, created_at TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS class_memberships (class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE, student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE, UNIQUE(class_id, student_id))",
        "CREATE TABLE IF NOT EXISTS assignments (id TEXT PRIMARY KEY, class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE, title TEXT NOT NULL, chapter TEXT, question_count INTEGER NOT NULL, roster_count INTEGER NOT NULL, scoring_policy_json TEXT NOT NULL, created_at TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS assignment_questions (id TEXT PRIMARY KEY, assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE, label TEXT NOT NULL, position INTEGER NOT NULL)",
        "CREATE TABLE IF NOT EXISTS assignment_roster (id TEXT PRIMARY KEY, assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE, student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT, student_name TEXT NOT NULL, student_no TEXT, UNIQUE(assignment_id, student_id))",
        "CREATE TABLE IF NOT EXISTS assignment_student_results (id TEXT PRIMARY KEY, assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE, question_id TEXT NOT NULL REFERENCES assignment_questions(id) ON DELETE CASCADE, student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE, status TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(assignment_id, question_id, student_id))",
        "CREATE TABLE IF NOT EXISTS grading_sessions (id TEXT PRIMARY KEY, assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE, started_at TEXT NOT NULL, current_student_id TEXT REFERENCES students(id), current_question_id TEXT REFERENCES assignment_questions(id), active INTEGER NOT NULL DEFAULT 1)",
        "CREATE TABLE IF NOT EXISTS grading_action_logs (id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES grading_sessions(id) ON DELETE CASCADE, assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE, question_id TEXT NOT NULL REFERENCES assignment_questions(id) ON DELETE CASCADE, student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE, action_kind TEXT NOT NULL, previous_status TEXT NOT NULL, new_status TEXT NOT NULL, client_event_id TEXT, created_at TEXT NOT NULL, undone INTEGER NOT NULL DEFAULT 0)",
        "CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS page_adapter_profiles (id TEXT PRIMARY KEY, name TEXT NOT NULL, host_pattern TEXT NOT NULL, primary_selector TEXT NOT NULL, fallback_selectors TEXT NOT NULL, anchor_texts TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS backup_records (id TEXT PRIMARY KEY, file_path TEXT NOT NULL, created_at TEXT NOT NULL, size_bytes INTEGER NOT NULL, note TEXT NOT NULL)",
        "CREATE INDEX IF NOT EXISTS idx_results_assignment_student ON assignment_student_results(assignment_id, student_id)",
        "CREATE INDEX IF NOT EXISTS idx_results_assignment_question ON assignment_student_results(assignment_id, question_id)",
        "CREATE INDEX IF NOT EXISTS idx_questions_assignment_position ON assignment_questions(assignment_id, position)",
        "CREATE INDEX IF NOT EXISTS idx_logs_session_created ON grading_action_logs(session_id, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_roster_assignment_student ON assignment_roster(assignment_id, student_id)",
    ];
    for statement in statements {
        sqlx::query(statement).execute(&mut *conn).await?;
    }
    Ok(())
}

pub async fn load_settings(pool: &SqlitePool) -> AppResult<AppSettings> {
    let bridge_port = get_setting(pool, "bridge_port").await?.unwrap_or_else(|| "48123".into());
    let auto_backup_enabled =
        get_setting(pool, "auto_backup_enabled").await?.unwrap_or_else(|| "true".into());
    let backup_directory = get_setting(pool, "backup_directory").await?.unwrap_or_else(|| {
        dirs::document_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("grading-backups")
            .display()
            .to_string()
    });
    let policy = get_setting(pool, "default_score_policy").await?;
    let default_score_policy =
        serde_json::from_str(&policy.unwrap_or_else(|| serde_json::to_string(&ScorePolicy::default()).unwrap()))?;
    Ok(AppSettings {
        bridge_port: bridge_port.parse().unwrap_or(48123),
        auto_backup_enabled: auto_backup_enabled == "true",
        backup_directory,
        default_score_policy,
    })
}

async fn get_setting(pool: &SqlitePool, key: &str) -> AppResult<Option<String>> {
    let row = sqlx::query_scalar::<_, String>("SELECT value FROM app_settings WHERE key = ?")
        .bind(key)
        .fetch_optional(pool)
        .await?;
    Ok(row)
}
