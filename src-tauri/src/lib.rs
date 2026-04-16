pub mod commands;
pub mod config;
pub mod error;
pub mod pty;
pub mod state;

use std::path::PathBuf;

use tauri::Manager;

use crate::config::{defaults, Settings};
use crate::state::AppState;

const APP_DIR_NAME: &str = "MultiTerminal";
const SETTINGS_FILE_NAME: &str = "settings.json";

fn settings_path() -> PathBuf {
    let base = dirs::data_dir().unwrap_or_else(|| {
        std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
    });
    base.join(APP_DIR_NAME).join(SETTINGS_FILE_NAME)
}

fn load_initial_settings(path: &std::path::Path) -> Settings {
    match std::fs::read_to_string(path) {
        Ok(content) => match serde_json::from_str::<Settings>(&content) {
            Ok(s) => s,
            Err(e) => {
                log::warn!(
                    "failed to parse settings at {}: {e}. Using defaults.",
                    path.display()
                );
                defaults::default_settings()
            }
        },
        Err(_) => defaults::default_settings(),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = env_logger::Builder::from_default_env()
        .filter_level(log::LevelFilter::Info)
        .format_timestamp_millis()
        .try_init();

    let sp = settings_path();
    let settings = load_initial_settings(&sp);
    let app_state = AppState::new(settings, sp);

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::terminal::terminal_create,
            commands::terminal::terminal_write,
            commands::terminal::terminal_resize,
            commands::terminal::terminal_kill,
            commands::terminal::terminal_list,
            commands::settings::settings_load,
            commands::settings::settings_save,
            commands::shell::shell_detect_default,
            commands::shell::shell_list_available,
            commands::window::window_minimize,
            commands::window::window_toggle_maximize,
            commands::window::window_close,
            commands::window::window_is_maximized,
            commands::fs::fs_home_dir,
            commands::fs::fs_expand_path,
            commands::fs::fs_list_subdirs,
            commands::fs::fs_path_is_dir,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                if let Some(state) = window.app_handle().try_state::<AppState>() {
                    state.pty_manager.shutdown_all();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
