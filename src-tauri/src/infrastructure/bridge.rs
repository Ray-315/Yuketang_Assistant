use crate::application::app_service::list_adapter_profiles;
use crate::application::grading_service::{identify_student, publish_snapshot, record_grade};
use crate::domain::models::{AdapterProfileView, GradeActionInput, SessionSnapshot};
use crate::error::AppResult;
use crate::state::SharedState;
use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::State;
use axum::response::IntoResponse;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use tower_http::cors::{Any, CorsLayer};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StudentIdentifyRequest {
    pub raw_name: String,
    pub source_url: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StudentIdentifyResponse {
    pub snapshot: SessionSnapshot,
    pub matched_student: Option<crate::domain::models::StudentRecord>,
    pub candidates: Vec<crate::domain::models::StudentRecord>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionStateResponse {
    pub snapshot: SessionSnapshot,
    pub adapters: Vec<AdapterProfileView>,
}

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    ok: bool,
}

pub async fn spawn_bridge(state: SharedState) -> AppResult<()> {
    let port = state.0.settings.read().await.bridge_port;
    let router = Router::new()
        .route("/api/bridge/health", get(health))
        .route("/api/bridge/session-state", get(session_state))
        .route("/api/bridge/identify-student", post(identify))
        .route("/api/bridge/grade-action", post(grade_action))
        .route("/ws", get(ws_upgrade))
        .layer(CorsLayer::new().allow_origin(Any).allow_headers(Any).allow_methods(Any))
        .with_state(state.clone());
    let listener = tokio::net::TcpListener::bind(("127.0.0.1", port)).await?;
    tokio::spawn(async move {
        let _ = axum::serve(listener, router).await;
    });
    Ok(())
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse { ok: true })
}

async fn session_state(State(state): State<SharedState>) -> Result<Json<SessionStateResponse>, String> {
    let pool = state.pool().await;
    Ok(Json(SessionStateResponse {
        snapshot: publish_snapshot(&state).await.map_err(String::from)?,
        adapters: list_adapter_profiles(&pool).await.map_err(String::from)?,
    }))
}

async fn identify(
    State(state): State<SharedState>,
    Json(payload): Json<StudentIdentifyRequest>,
) -> Result<Json<StudentIdentifyResponse>, String> {
    let snapshot = identify_student(&state, &payload.raw_name).await.map_err(String::from)?;
    let candidates = snapshot.match_candidates.clone();
    let matched_student = if snapshot.match_state == "matched" {
        candidates.first().cloned()
    } else {
        None
    };
    Ok(Json(StudentIdentifyResponse { snapshot, matched_student, candidates }))
}

async fn grade_action(
    State(state): State<SharedState>,
    Json(payload): Json<GradeActionInput>,
) -> Result<Json<SessionSnapshot>, String> {
    record_grade(&state, payload).await.map(Json).map_err(String::from)
}

async fn ws_upgrade(ws: WebSocketUpgrade, State(state): State<SharedState>) -> impl IntoResponse {
    ws.on_upgrade(move |socket| ws_client(socket, state))
}

async fn ws_client(mut socket: WebSocket, state: SharedState) {
    if let Ok(snapshot) = publish_snapshot(&state).await {
        let _ = socket
            .send(Message::Text(serde_json::to_string(&snapshot).unwrap_or_default().into()))
            .await;
    }
    let mut receiver = state.0.session_sender.subscribe();
    loop {
        tokio::select! {
            Ok(snapshot) = receiver.recv() => {
                if socket.send(Message::Text(serde_json::to_string(&snapshot).unwrap_or_default().into())).await.is_err() {
                    break;
                }
            }
            message = socket.recv() => {
                if message.is_none() {
                    break;
                }
            }
        }
    }
}
