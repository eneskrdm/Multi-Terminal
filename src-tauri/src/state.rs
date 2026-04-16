use std::path::PathBuf;
use std::sync::Arc;

use parking_lot::Mutex;

use crate::config::Settings;
use crate::pty::PtyManager;

pub struct AppState {
    pub pty_manager: Arc<PtyManager>,
    pub settings: Arc<Mutex<Settings>>,
    pub settings_path: PathBuf,
}

impl AppState {
    pub fn new(settings: Settings, settings_path: PathBuf) -> Self {
        Self {
            pty_manager: Arc::new(PtyManager::new()),
            settings: Arc::new(Mutex::new(settings)),
            settings_path,
        }
    }
}
