use crate::domain::models::BackupRecord;
use crate::error::AppResult;
use chrono::Utc;
use sqlx::SqlitePool;
use std::fs::File;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use uuid::Uuid;
use zip::write::SimpleFileOptions;

pub async fn create_backup(pool: &SqlitePool, db_path: &Path, backup_dir: &Path, note: &str) -> AppResult<BackupRecord> {
    tokio::fs::create_dir_all(backup_dir).await?;
    let id = Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    let file_path = backup_dir.join(format!("grading-backup-{}.zip", created_at.replace(':', "-")));
    let db_bytes = tokio::fs::read(db_path).await?;
    let mut writer = zip::ZipWriter::new(File::create(&file_path)?);
    let options = SimpleFileOptions::default();
    writer.start_file("grading-workbench.sqlite3", options)?;
    writer.write_all(&db_bytes)?;
    writer.start_file("manifest.json", options)?;
    writer.write_all(format!(r#"{{"createdAt":"{}","note":"{}"}}"#, created_at, note).as_bytes())?;
    writer.finish()?;
    let size_bytes = tokio::fs::metadata(&file_path).await?.len() as i64;
    sqlx::query("INSERT INTO backup_records(id, file_path, created_at, size_bytes, note) VALUES(?, ?, ?, ?, ?)")
        .bind(&id)
        .bind(file_path.display().to_string())
        .bind(&created_at)
        .bind(size_bytes)
        .bind(note)
        .execute(pool)
        .await?;
    Ok(BackupRecord { id, file_path: file_path.display().to_string(), created_at, size_bytes, note: note.into() })
}

pub async fn restore_backup(backup_path: &str, target_db_path: &Path) -> AppResult<()> {
    let archive = File::open(backup_path)?;
    let mut zip = zip::ZipArchive::new(archive)?;
    let mut db_file = zip.by_name("grading-workbench.sqlite3")?;
    let mut buffer = Vec::new();
    db_file.read_to_end(&mut buffer)?;
    tokio::fs::write(target_db_path, buffer).await?;
    Ok(())
}

pub async fn prune_old_backups(pool: &SqlitePool, keep_latest: usize) -> AppResult<()> {
    let rows = sqlx::query_as::<_, BackupRecord>("SELECT id, file_path, created_at, size_bytes, note FROM backup_records ORDER BY created_at DESC")
        .fetch_all(pool)
        .await?;
    for backup in rows.iter().skip(keep_latest) {
        let _ = tokio::fs::remove_file(PathBuf::from(&backup.file_path)).await;
        sqlx::query("DELETE FROM backup_records WHERE id = ?")
            .bind(&backup.id)
            .execute(pool)
            .await?;
    }
    Ok(())
}
