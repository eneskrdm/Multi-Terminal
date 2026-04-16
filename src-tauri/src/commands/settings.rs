use tauri::State;

use crate::config::{defaults, Settings};
use crate::error::{AppError, Result};
use crate::state::AppState;

#[tauri::command]
pub async fn settings_load(
    state: State<'_, AppState>,
) -> std::result::Result<Settings, String> {
    let path = state.settings_path.clone();
    let loaded = tokio::task::spawn_blocking(move || -> Result<Settings> {
        if path.exists() {
            let content = std::fs::read_to_string(&path)?;
            let settings: Settings = serde_json::from_str(&content)?;
            Ok(settings)
        } else {
            Ok(defaults::default_settings())
        }
    })
    .await
    .map_err(|e| AppError::other(e).to_string())?
    .map_err(|e| e.to_string())?;

    *state.settings.lock() = loaded.clone();
    Ok(loaded)
}

#[tauri::command]
pub async fn settings_save(
    state: State<'_, AppState>,
    settings: Settings,
) -> std::result::Result<(), String> {
    let path = state.settings_path.clone();
    let to_save = settings.clone();

    tokio::task::spawn_blocking(move || -> Result<()> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let json = serde_json::to_string_pretty(&to_save)?;
        std::fs::write(&path, json)?;
        Ok(())
    })
    .await
    .map_err(|e| AppError::other(e).to_string())?
    .map_err(|e| e.to_string())?;

    *state.settings.lock() = settings;
    Ok(())
}
