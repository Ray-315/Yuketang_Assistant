use crate::domain::scoring::ScorePolicy;
use crate::error::AppResult;
use sqlx::SqlitePool;
use uuid::Uuid;

pub async fn ensure_defaults(pool: &SqlitePool) -> AppResult<()> {
    set_if_missing(pool, "bridge_port", "48123").await?;
    set_if_missing(pool, "auto_backup_enabled", "true").await?;
    let backup_dir = dirs::document_dir()
        .unwrap_or_default()
        .join("grading-backups")
        .display()
        .to_string();
    set_if_missing(pool, "backup_directory", &backup_dir).await?;
    set_if_missing(pool, "ui_mode", "zen").await?;
    set_if_missing(
        pool,
        "default_score_policy",
        &serde_json::to_string(&ScorePolicy::default())?,
    )
    .await?;
    ensure_default_adapter(pool).await?;
    Ok(())
}

async fn set_if_missing(pool: &SqlitePool, key: &str, value: &str) -> AppResult<()> {
    sqlx::query(
        "INSERT INTO app_settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO NOTHING",
    )
    .bind(key)
    .bind(value)
    .execute(pool)
    .await?;
    Ok(())
}

async fn ensure_default_adapter(pool: &SqlitePool) -> AppResult<()> {
    let exists = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM page_adapter_profiles")
        .fetch_one(pool)
        .await?;
    if exists > 0 {
        return Ok(());
    }
    let selector = "#app > section > section > section > div.box__left > section > div > div > div > div > div.el-table__body-wrapper.is-scrolling-none > table > tbody > tr.el-table__row.current-row > td.el-table_1_column_1.el-table__cell > div > div > section.user > div > span.f14.c333.username";
    sqlx::query("INSERT INTO page_adapter_profiles(id, name, host_pattern, primary_selector, fallback_selectors, anchor_texts, enabled, created_at) VALUES(?, ?, ?, ?, ?, ?, 1, datetime('now'))")
        .bind(Uuid::new_v4().to_string())
        .bind("默认批改页")
        .bind("*")
        .bind(selector)
        .bind(serde_json::to_string(&vec![selector])?)
        .bind(serde_json::to_string(&vec!["username", "当前学生"]) ?)
        .execute(pool)
        .await?;
    Ok(())
}
