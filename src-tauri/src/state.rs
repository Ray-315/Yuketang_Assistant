use crate::domain::models::{AppSettings, SessionSnapshot, StudentRecord};
use sqlx::SqlitePool;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::AppHandle;
use tokio::sync::{broadcast, RwLock};

#[derive(Debug, Clone, Default)]
pub struct ActiveSession {
    pub session_id: Option<String>,
    pub assignment_id: Option<String>,
    pub current_student_id: Option<String>,
    pub current_question_id: Option<String>,
    pub last_action: Option<String>,
    pub connection_state: String,
    pub match_state: String,
    pub match_candidates: Vec<StudentRecord>,
}

#[derive(Clone)]
pub struct SharedState(pub Arc<StateInner>);

pub struct StateInner {
    pub pool: RwLock<SqlitePool>,
    pub db_path: PathBuf,
    pub settings: RwLock<AppSettings>,
    pub active_session: RwLock<ActiveSession>,
    pub app_handle: RwLock<Option<AppHandle>>,
    pub session_sender: broadcast::Sender<SessionSnapshot>,
}

impl SharedState {
    pub fn new(pool: SqlitePool, db_path: PathBuf, settings: AppSettings) -> Self {
        let (session_sender, _) = broadcast::channel(64);
        Self(Arc::new(StateInner {
            pool: RwLock::new(pool),
            db_path,
            settings: RwLock::new(settings),
            active_session: RwLock::new(ActiveSession {
                connection_state: "idle".into(),
                match_state: "missing".into(),
                ..Default::default()
            }),
            app_handle: RwLock::new(None),
            session_sender,
        }))
    }

    pub async fn pool(&self) -> SqlitePool {
        self.0.pool.read().await.clone()
    }

    pub async fn replace_pool(&self, pool: SqlitePool) {
        *self.0.pool.write().await = pool;
    }
}
