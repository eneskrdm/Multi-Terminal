use tauri::{AppHandle, Manager};

use crate::error::AppError;

const MAIN_LABEL: &str = "main";

fn to_err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

#[tauri::command]
pub async fn window_minimize(app: AppHandle) -> std::result::Result<(), String> {
    let window = app
        .get_webview_window(MAIN_LABEL)
        .ok_or_else(|| AppError::WindowNotFound(MAIN_LABEL.into()).to_string())?;
    window.minimize().map_err(to_err)
}

#[tauri::command]
pub async fn window_toggle_maximize(app: AppHandle) -> std::result::Result<(), String> {
    let window = app
        .get_webview_window(MAIN_LABEL)
        .ok_or_else(|| AppError::WindowNotFound(MAIN_LABEL.into()).to_string())?;
    let is_max = window.is_maximized().map_err(to_err)?;
    if is_max {
        window.unmaximize().map_err(to_err)
    } else {
        window.maximize().map_err(to_err)
    }
}

#[tauri::command]
pub async fn window_close(app: AppHandle) -> std::result::Result<(), String> {
    let window = app
        .get_webview_window(MAIN_LABEL)
        .ok_or_else(|| AppError::WindowNotFound(MAIN_LABEL.into()).to_string())?;
    window.close().map_err(to_err)
}

#[tauri::command]
pub async fn window_is_maximized(app: AppHandle) -> std::result::Result<bool, String> {
    let window = app
        .get_webview_window(MAIN_LABEL)
        .ok_or_else(|| AppError::WindowNotFound(MAIN_LABEL.into()).to_string())?;
    window.is_maximized().map_err(to_err)
}
