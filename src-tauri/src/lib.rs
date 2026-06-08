mod error;
mod core;
mod commands;
mod pg;

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
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_connections,
            commands::save_connection,
            commands::delete_connection,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
