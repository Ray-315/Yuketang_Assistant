pub mod application;
pub mod commands;
pub mod domain;
pub mod error;
pub mod infrastructure;
pub mod state;

use error::AppResult;
use state::SharedState;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let handle = app.handle().clone();
            let runtime = tauri::async_runtime::handle();
            let shared_state = runtime.block_on(async { initialize_state().await })?;
            runtime.block_on(async {
                *shared_state.0.app_handle.write().await = Some(handle.clone());
                let _ = infrastructure::bridge::spawn_bridge(shared_state.clone()).await;
                let _ = application::report_service::maybe_run_startup_backup(&shared_state).await;
            });
            app.manage(shared_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::data::bootstrap_app,
            commands::data::save_class,
            commands::data::delete_class,
            commands::data::save_student,
            commands::data::delete_student,
            commands::data::import_students,
            commands::data::save_assignment,
            commands::data::get_assignment_detail,
            commands::grading::start_grading_session,
            commands::grading::grade_from_desktop,
            commands::grading::manual_select_student,
            commands::grading::manual_select_question,
            commands::grading::undo_last_grade,
            commands::system::save_settings,
            commands::system::save_adapter_profile,
            commands::system::create_backup,
            commands::system::restore_backup,
            commands::system::export_assignment,
            commands::system::generate_student_template
        ])
        .run(tauri::generate_context!())
        .expect("failed to run grading workbench");
}

async fn initialize_state() -> AppResult<SharedState> {
    let db_path = infrastructure::database::database_path().await?;
    let pool = infrastructure::database::connect(&db_path).await?;
    infrastructure::seed::ensure_defaults(&pool).await?;
    let settings = infrastructure::database::load_settings(&pool).await?;
    Ok(SharedState::new(pool, db_path, settings))
}
