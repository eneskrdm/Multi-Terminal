use tauri::{AppHandle, State};

use crate::config::Profile;
use crate::error::{AppError, Result};
use crate::pty::TerminalProcess;
use crate::state::AppState;

fn to_cmd_err<T>(r: Result<T>) -> std::result::Result<T, String> {
    r.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn terminal_create(
    app: AppHandle,
    state: State<'_, AppState>,
    profile: Profile,
    cols: u16,
    rows: u16,
) -> std::result::Result<TerminalProcess, String> {
    if cols == 0 || rows == 0 {
        return Err(AppError::InvalidArgument(
            "cols and rows must be > 0".into(),
        )
        .to_string());
    }
    let manager = state.pty_manager.clone();
    let result = tokio::task::spawn_blocking(move || {
        manager.create(app, &profile, cols, rows)
    })
    .await
    .map_err(|e| AppError::other(e).to_string())?;
    to_cmd_err(result)
}

#[tauri::command]
pub async fn terminal_write(
    state: State<'_, AppState>,
    id: String,
    data: String,
) -> std::result::Result<(), String> {
    to_cmd_err(state.pty_manager.write(&id, data.as_bytes()))
}

#[tauri::command]
pub async fn terminal_resize(
    state: State<'_, AppState>,
    id: String,
    cols: u16,
    rows: u16,
) -> std::result::Result<(), String> {
    if cols == 0 || rows == 0 {
        return Err(AppError::InvalidArgument(
            "cols and rows must be > 0".into(),
        )
        .to_string());
    }
    to_cmd_err(state.pty_manager.resize(&id, cols, rows))
}

#[tauri::command]
pub async fn terminal_kill(
    state: State<'_, AppState>,
    id: String,
) -> std::result::Result<(), String> {
    to_cmd_err(state.pty_manager.kill(&id))
}

#[tauri::command]
pub async fn terminal_list(
    state: State<'_, AppState>,
) -> std::result::Result<Vec<TerminalProcess>, String> {
    Ok(state.pty_manager.list())
}
