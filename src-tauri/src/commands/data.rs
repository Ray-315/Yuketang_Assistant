use crate::application::app_service;
use crate::domain::models::{AppBootstrap, AssignmentOverview, SaveAssignmentInput, SaveClassInput, SaveStudentInput};
use crate::state::SharedState;

#[tauri::command]
pub async fn bootstrap_app(state: tauri::State<'_, SharedState>) -> Result<AppBootstrap, String> {
    app_service::bootstrap(&state).await.map_err(String::from)
}

#[tauri::command]
pub async fn save_class(state: tauri::State<'_, SharedState>, input: SaveClassInput) -> Result<(), String> {
    app_service::save_class(&state.pool().await, input).await.map_err(String::from)
}

#[tauri::command]
pub async fn delete_class(state: tauri::State<'_, SharedState>, id: String) -> Result<(), String> {
    app_service::delete_class(&state.pool().await, &id).await.map_err(String::from)
}

#[tauri::command]
pub async fn save_student(state: tauri::State<'_, SharedState>, input: SaveStudentInput) -> Result<(), String> {
    app_service::save_student(&state.pool().await, input).await.map_err(String::from)
}

#[tauri::command]
pub async fn delete_student(state: tauri::State<'_, SharedState>, id: String) -> Result<(), String> {
    app_service::delete_student(&state.pool().await, &id).await.map_err(String::from)
}

#[tauri::command]
pub async fn import_students(state: tauri::State<'_, SharedState>, class_id: String, path: String) -> Result<(), String> {
    app_service::import_students(&state.pool().await, &class_id, &path).await.map_err(String::from)
}

#[tauri::command]
pub async fn save_assignment(state: tauri::State<'_, SharedState>, input: SaveAssignmentInput) -> Result<(), String> {
    app_service::save_assignment(&state.pool().await, input).await.map_err(String::from)
}

#[tauri::command]
pub async fn get_assignment_detail(state: tauri::State<'_, SharedState>, id: String) -> Result<AssignmentOverview, String> {
    app_service::get_assignment_detail(&state.pool().await, &id).await.map_err(String::from)
}
