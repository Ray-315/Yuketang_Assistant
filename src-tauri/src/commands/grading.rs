use crate::application::grading_service;
use crate::domain::models::{GradeActionInput, SessionSnapshot};
use crate::state::SharedState;

#[tauri::command]
pub async fn start_grading_session(state: tauri::State<'_, SharedState>, assignment_id: String) -> Result<SessionSnapshot, String> {
    grading_service::start_session(&state, &assignment_id).await.map_err(String::from)
}

#[tauri::command]
pub async fn grade_from_desktop(state: tauri::State<'_, SharedState>, input: GradeActionInput) -> Result<SessionSnapshot, String> {
    grading_service::record_grade(&state, input).await.map_err(String::from)
}

#[tauri::command]
pub async fn manual_select_student(state: tauri::State<'_, SharedState>, student_id: String) -> Result<SessionSnapshot, String> {
    grading_service::select_student(&state, &student_id).await.map_err(String::from)
}

#[tauri::command]
pub async fn manual_select_question(state: tauri::State<'_, SharedState>, question_id: String) -> Result<SessionSnapshot, String> {
    grading_service::select_question(&state, &question_id).await.map_err(String::from)
}

#[tauri::command]
pub async fn undo_last_grade(state: tauri::State<'_, SharedState>) -> Result<SessionSnapshot, String> {
    grading_service::undo_last(&state).await.map_err(String::from)
}
