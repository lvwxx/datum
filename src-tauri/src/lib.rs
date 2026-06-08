mod error;
mod core;
mod commands;
mod pg;
mod rds;

use commands::AppState;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let config_dir = app.path().app_config_dir()
                .expect("无法获取应用配置目录");
            app.manage(AppState {
                config_dir,
                backend: crate::core::credentials::KeyringBackend,
                lock: Mutex::new(()),
                pg_pool: crate::pg::client::PgPool::default(),
                redis_pool: crate::rds::client::RedisPool::default(),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_connections,
            commands::save_connection,
            commands::delete_connection,
            pg::commands::pg_connect,
            pg::commands::pg_list_objects,
            pg::commands::pg_query,
            pg::commands::pg_table_detail,
            pg::commands::pg_commit_edits,
            rds::commands::redis_connect,
            rds::commands::redis_scan,
            rds::commands::redis_get_key,
            rds::commands::redis_key_detail,
            rds::commands::redis_exec,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
