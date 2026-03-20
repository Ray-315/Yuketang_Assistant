use crate::application::app_service::get_assignment_detail;
use crate::domain::models::BackupRecord;
use crate::error::AppResult;
use crate::infrastructure::backup::{create_backup as write_backup, prune_old_backups, restore_backup as unzip_backup};
use crate::infrastructure::import_export::{write_assignment_export, write_student_template};
use crate::state::SharedState;
use chrono::{Duration, Utc};
use std::path::PathBuf;

pub async fn create_backup(state: &SharedState) -> AppResult<BackupRecord> {
    let pool = state.pool().await;
    let settings = state.0.settings.read().await.clone();
    let record = write_backup(&pool, &state.0.db_path, &PathBuf::from(&settings.backup_directory), "手动备份").await?;
    prune_old_backups(&pool, 30).await?;
    Ok(record)
}

pub async fn maybe_run_startup_backup(state: &SharedState) -> AppResult<()> {
    let settings = state.0.settings.read().await.clone();
    if !settings.auto_backup_enabled {
        return Ok(());
    }
    let pool = state.pool().await;
    let last_backup = sqlx::query_scalar::<_, String>(
        "SELECT created_at FROM backup_records ORDER BY created_at DESC LIMIT 1",
    )
    .fetch_optional(&pool)
    .await?;
    let should_backup = last_backup
        .and_then(|value| chrono::DateTime::parse_from_rfc3339(&value).ok())
        .map(|value| Utc::now().signed_duration_since(value.with_timezone(&Utc)) > Duration::hours(24))
        .unwrap_or(true);
    if should_backup {
        let _ = write_backup(&pool, &state.0.db_path, &PathBuf::from(&settings.backup_directory), "自动备份").await?;
        prune_old_backups(&pool, 30).await?;
    }
    Ok(())
}

pub async fn restore_backup(state: &SharedState, id: &str) -> AppResult<()> {
    let pool = state.pool().await;
    let path = sqlx::query_scalar::<_, String>("SELECT file_path FROM backup_records WHERE id = ?")
        .bind(id)
        .fetch_one(&pool)
        .await?;
    pool.close().await;
    unzip_backup(&path, &state.0.db_path).await?;
    let new_pool = crate::infrastructure::database::connect(&state.0.db_path).await?;
    state.replace_pool(new_pool).await;
    Ok(())
}

pub async fn export_assignment(state: &SharedState, assignment_id: &str, format: &str, path: &str) -> AppResult<()> {
    let detail = get_assignment_detail(&state.pool().await, assignment_id).await?;
    write_assignment_export(path, format, &detail)
}

pub fn generate_student_template(format: &str, path: &str) -> AppResult<()> {
    write_student_template(path, format)
}
