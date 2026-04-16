use std::fmt;

use serde::{Serialize, Serializer};
use thiserror::Error;

pub type Result<T> = std::result::Result<T, AppError>;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error("tauri error: {0}")]
    Tauri(#[from] tauri::Error),

    #[error("terminal {0} not found")]
    TerminalNotFound(String),

    #[error("pty error: {0}")]
    Pty(String),

    #[error("invalid argument: {0}")]
    InvalidArgument(String),

    #[error("settings directory unavailable")]
    SettingsDirUnavailable,

    #[error("window '{0}' not found")]
    WindowNotFound(String),

    #[error("{0}")]
    Other(String),
}

impl AppError {
    pub fn pty<E: fmt::Display>(err: E) -> Self {
        AppError::Pty(err.to_string())
    }

    pub fn other<E: fmt::Display>(err: E) -> Self {
        AppError::Other(err.to_string())
    }
}

impl From<anyhow::Error> for AppError {
    fn from(err: anyhow::Error) -> Self {
        AppError::Other(err.to_string())
    }
}

impl From<String> for AppError {
    fn from(err: String) -> Self {
        AppError::Other(err)
    }
}

impl From<&str> for AppError {
    fn from(err: &str) -> Self {
        AppError::Other(err.to_string())
    }
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}
