use crate::application::{app_service, report_service};
use crate::domain::models::{AdapterProfileView, AppSettings, BackupRecord};
use crate::state::SharedState;

#[tauri::command]
pub async fn save_settings(state: tauri::State<'_, SharedState>, input: AppSettings) -> Result<(), String> {
    app_service::save_settings(&state, input).await.map_err(String::from)
}

#[tauri::command]
pub async fn save_adapter_profile(state: tauri::State<'_, SharedState>, input: AdapterProfileView) -> Result<(), String> {
    app_service::save_adapter_profile(&state.pool().await, input).await.map_err(String::from)
}

#[tauri::command]
pub async fn create_backup(state: tauri::State<'_, SharedState>) -> Result<BackupRecord, String> {
    report_service::create_backup(&state).await.map_err(String::from)
}

#[tauri::command]
pub async fn restore_backup(state: tauri::State<'_, SharedState>, id: String) -> Result<(), String> {
    report_service::restore_backup(&state, &id).await.map_err(String::from)
}

#[tauri::command]
pub async fn export_assignment(state: tauri::State<'_, SharedState>, assignment_id: String, format: String, path: String) -> Result<(), String> {
    report_service::export_assignment(&state, &assignment_id, &format, &path).await.map_err(String::from)
}

#[tauri::command]
pub fn generate_student_template(format: String, path: String) -> Result<(), String> {
    report_service::generate_student_template(&format, &path).map_err(String::from)
}
