use crate::domain::scoring::ScorePolicy;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ClassRecord {
    pub id: String,
    pub name: String,
    pub subject: Option<String>,
    pub notes: Option<String>,
    pub student_count: i64,
    pub assignment_count: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct StudentRecord {
    pub id: String,
    pub name: String,
    pub student_no: Option<String>,
    pub notes: Option<String>,
    #[sqlx(skip)]
    pub class_ids: Vec<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct QuestionRecord {
    pub id: String,
    pub label: String,
    pub position: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct AssignmentRecord {
    pub id: String,
    pub class_id: String,
    pub class_name: String,
    pub title: String,
    pub chapter: Option<String>,
    pub question_count: i64,
    pub roster_count: i64,
    pub completed_students: i64,
    pub average_score: f64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StudentQuestionResult {
    pub question_id: String,
    pub question_label: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StudentResultRow {
    pub student_id: String,
    pub student_name: String,
    pub wrong_count: i64,
    pub graded_count: i64,
    pub score: Option<i64>,
    pub completion_state: String,
    pub results: Vec<StudentQuestionResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct QuestionStatRow {
    pub question_id: String,
    pub question_label: String,
    pub graded_count: i64,
    pub correct_count: i64,
    pub incorrect_count: i64,
    pub correct_rate: f64,
    pub incorrect_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssignmentAverages {
    pub average_wrong: f64,
    pub average_score: f64,
    pub full_score_count: i64,
    pub completed_students: i64,
    pub total_students: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssignmentOverview {
    pub assignment: AssignmentRecord,
    pub questions: Vec<QuestionRecord>,
    pub students: Vec<StudentResultRow>,
    pub questions_stats: Vec<QuestionStatRow>,
    pub averages: AssignmentAverages,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct AdapterProfile {
    pub id: String,
    pub name: String,
    pub host_pattern: String,
    pub primary_selector: String,
    pub fallback_selectors: String,
    pub anchor_texts: String,
    pub enabled: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct BackupRecord {
    pub id: String,
    pub file_path: String,
    pub created_at: String,
    pub size_bytes: i64,
    pub note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub bridge_port: u16,
    pub auto_backup_enabled: bool,
    pub backup_directory: String,
    pub default_score_policy: ScorePolicy,
    pub ui_mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionSnapshot {
    pub session_id: Option<String>,
    pub assignment_id: Option<String>,
    pub assignment_title: Option<String>,
    pub class_name: Option<String>,
    pub current_student_id: Option<String>,
    pub current_student_name: Option<String>,
    pub current_question_id: Option<String>,
    pub current_question_label: Option<String>,
    pub question_index: i64,
    pub question_count: i64,
    pub graded_count: i64,
    pub wrong_count: i64,
    pub predicted_score: i64,
    pub current_student_completed: bool,
    pub last_action: Option<String>,
    pub connection_state: String,
    pub match_state: String,
    pub match_candidates: Vec<StudentRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppBootstrap {
    pub classes: Vec<ClassRecord>,
    pub students: Vec<StudentRecord>,
    pub assignments: Vec<AssignmentRecord>,
    pub settings: AppSettings,
    pub adapters: Vec<AdapterProfileView>,
    pub backups: Vec<BackupRecord>,
    pub session: SessionSnapshot,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdapterProfileView {
    pub id: String,
    pub name: String,
    pub host_pattern: String,
    pub primary_selector: String,
    pub fallback_selectors: Vec<String>,
    pub anchor_texts: Vec<String>,
    pub enabled: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveClassInput {
    pub id: Option<String>,
    pub name: String,
    pub subject: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveStudentInput {
    pub id: Option<String>,
    pub name: String,
    pub student_no: Option<String>,
    pub notes: Option<String>,
    pub class_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveAssignmentInput {
    pub id: Option<String>,
    pub class_id: String,
    pub title: String,
    pub chapter: Option<String>,
    pub question_labels: Vec<String>,
    pub scoring_policy: ScorePolicy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GradeActionInput {
    pub action: String,
    pub student_id: Option<String>,
    pub question_id: Option<String>,
    pub raw_student_name: Option<String>,
    pub client_event_id: Option<String>,
}
