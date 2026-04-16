use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use parking_lot::Mutex;
use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::{AppHandle, Emitter, Manager};
use uuid::Uuid;

use crate::config::Profile;
use crate::error::{AppError, Result};
use crate::state::AppState;

const READ_BUF_SIZE: usize = 8 * 1024;
const EMIT_FLUSH_INTERVAL: Duration = Duration::from_millis(16);
const READ_POLL_SLEEP: Duration = Duration::from_millis(4);

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalProcess {
    pub id: String,
    pub pid: Option<u32>,
    pub shell: String,
    pub args: Vec<String>,
    pub cwd: String,
    pub cols: u16,
    pub rows: u16,
    pub title: String,
    pub created_at: u64,
    pub exited: bool,
    pub exit_code: Option<i32>,
}

struct PtyEntry {
    meta: TerminalProcess,
    master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    child: Arc<Mutex<Box<dyn Child + Send + Sync>>>,
    running: Arc<AtomicBool>,
}

pub struct PtyManager {
    entries: Mutex<HashMap<String, PtyEntry>>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            entries: Mutex::new(HashMap::new()),
        }
    }

    pub fn create(
        &self,
        app: AppHandle,
        profile: &Profile,
        cols: u16,
        rows: u16,
    ) -> Result<TerminalProcess> {
        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(AppError::pty)?;

        let mut cmd = CommandBuilder::new(&profile.shell);
        for arg in &profile.args {
            cmd.arg(arg);
        }

        let cwd = resolve_cwd(profile.cwd.as_deref());
        cmd.cwd(&cwd);

        for (k, v) in &profile.env {
            cmd.env(k, v);
        }
        if !profile.env.contains_key("TERM") {
            cmd.env("TERM", "xterm-256color");
        }
        if !profile.env.contains_key("COLORTERM") {
            cmd.env("COLORTERM", "truecolor");
        }

        let child = pair.slave.spawn_command(cmd).map_err(AppError::pty)?;
        drop(pair.slave);

        let pid = child.process_id();
        let id = Uuid::new_v4().to_string();
        let created_at = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or_default();

        let writer = pair.master.take_writer().map_err(AppError::pty)?;
        let reader = pair.master.try_clone_reader().map_err(AppError::pty)?;

        let meta = TerminalProcess {
            id: id.clone(),
            pid,
            shell: profile.shell.clone(),
            args: profile.args.clone(),
            cwd: cwd.to_string_lossy().to_string(),
            cols,
            rows,
            title: profile.name.clone(),
            created_at,
            exited: false,
            exit_code: None,
        };

        let master: Box<dyn MasterPty + Send> = pair.master;
        let entry = PtyEntry {
            meta: meta.clone(),
            master: Arc::new(Mutex::new(master)),
            writer: Arc::new(Mutex::new(writer)),
            child: Arc::new(Mutex::new(child)),
            running: Arc::new(AtomicBool::new(true)),
        };

        let reader_running = entry.running.clone();
        let waiter_running = entry.running.clone();
        let child_handle = entry.child.clone();

        self.entries.lock().insert(id.clone(), entry);

        let reader_id = id.clone();
        let reader_app = app.clone();
        thread::Builder::new()
            .name(format!("pty-reader-{id}"))
            .spawn(move || {
                read_pump(reader_app, reader_id, reader, reader_running);
            })
            .map_err(|e| AppError::pty(format!("failed to spawn pty reader thread: {e}")))?;

        let waiter_id = id.clone();
        let waiter_app = app;
        thread::Builder::new()
            .name(format!("pty-waiter-{waiter_id}"))
            .spawn(move || {
                wait_pump(waiter_app, waiter_id, child_handle, waiter_running);
            })
            .map_err(|e| AppError::pty(format!("failed to spawn pty waiter thread: {e}")))?;

        Ok(meta)
    }

    pub fn write(&self, id: &str, data: &[u8]) -> Result<()> {
        let writer = {
            let entries = self.entries.lock();
            entries
                .get(id)
                .ok_or_else(|| AppError::TerminalNotFound(id.to_string()))?
                .writer
                .clone()
        };
        let mut w = writer.lock();
        w.write_all(data)?;
        w.flush()?;
        Ok(())
    }

    pub fn resize(&self, id: &str, cols: u16, rows: u16) -> Result<()> {
        let master = {
            let entries = self.entries.lock();
            entries
                .get(id)
                .ok_or_else(|| AppError::TerminalNotFound(id.to_string()))?
                .master
                .clone()
        };

        master
            .lock()
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(AppError::pty)?;

        let mut entries = self.entries.lock();
        if let Some(entry) = entries.get_mut(id) {
            entry.meta.cols = cols;
            entry.meta.rows = rows;
        }
        Ok(())
    }

    pub fn kill(&self, id: &str) -> Result<()> {
        let (child, running) = {
            let entries = self.entries.lock();
            let entry = entries
                .get(id)
                .ok_or_else(|| AppError::TerminalNotFound(id.to_string()))?;
            (entry.child.clone(), entry.running.clone())
        };

        running.store(false, Ordering::SeqCst);
        if let Err(e) = child.lock().kill() {
            log::warn!("error killing pty {id}: {e}");
        }

        self.entries.lock().remove(id);
        Ok(())
    }

    pub fn list(&self) -> Vec<TerminalProcess> {
        self.entries
            .lock()
            .values()
            .map(|e| e.meta.clone())
            .collect()
    }

    pub fn update_title(&self, id: &str, title: &str) {
        let mut entries = self.entries.lock();
        if let Some(entry) = entries.get_mut(id) {
            entry.meta.title = title.to_string();
        }
    }

    pub fn mark_exited(&self, id: &str, code: Option<i32>) {
        let mut entries = self.entries.lock();
        if let Some(entry) = entries.get_mut(id) {
            entry.meta.exited = true;
            entry.meta.exit_code = code;
        }
    }

    pub fn shutdown_all(&self) {
        let mut entries = self.entries.lock();
        for (id, entry) in entries.drain() {
            entry.running.store(false, Ordering::SeqCst);
            if let Err(e) = entry.child.lock().kill() {
                log::warn!("error killing pty {id} during shutdown: {e}");
            }
        }
    }
}

impl Default for PtyManager {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for PtyManager {
    fn drop(&mut self) {
        self.shutdown_all();
    }
}

fn resolve_cwd(cwd: Option<&str>) -> std::path::PathBuf {
    if let Some(raw) = cwd {
        let trimmed = raw.trim();
        if !trimmed.is_empty() {
            let path = std::path::PathBuf::from(trimmed);
            if path.is_dir() {
                return path;
            }
        }
    }
    if let Some(home) = dirs::home_dir() {
        if home.is_dir() {
            return home;
        }
    }
    std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."))
}

fn read_pump(
    app: AppHandle,
    id: String,
    mut reader: Box<dyn Read + Send>,
    running: Arc<AtomicBool>,
) {
    let mut buf = [0u8; READ_BUF_SIZE];
    let mut pending: Vec<u8> = Vec::with_capacity(READ_BUF_SIZE);
    let mut last_flush = Instant::now();
    let mut title_parser = TitleParser::new();

    while running.load(Ordering::SeqCst) {
        match reader.read(&mut buf) {
            Ok(0) => {
                if !pending.is_empty() {
                    flush_pending(&app, &id, &mut pending);
                }
                break;
            }
            Ok(n) => {
                let slice = &buf[..n];
                if let Some(title) = title_parser.consume(slice) {
                    if let Some(state) = app.try_state::<AppState>() {
                        state.pty_manager.update_title(&id, &title);
                    }
                    let _ = app.emit(
                        "terminal:title",
                        json!({ "terminalId": &id, "title": title }),
                    );
                }
                pending.extend_from_slice(slice);
                if pending.len() >= READ_BUF_SIZE
                    || last_flush.elapsed() >= EMIT_FLUSH_INTERVAL
                {
                    flush_pending(&app, &id, &mut pending);
                    last_flush = Instant::now();
                }
            }
            Err(err) => {
                if err.kind() == std::io::ErrorKind::Interrupted {
                    continue;
                }
                if err.kind() == std::io::ErrorKind::WouldBlock {
                    if last_flush.elapsed() >= EMIT_FLUSH_INTERVAL && !pending.is_empty() {
                        flush_pending(&app, &id, &mut pending);
                        last_flush = Instant::now();
                    }
                    thread::sleep(READ_POLL_SLEEP);
                    continue;
                }
                if !pending.is_empty() {
                    flush_pending(&app, &id, &mut pending);
                }
                log::debug!("pty {id} read ended: {err}");
                break;
            }
        }
    }

    if !pending.is_empty() {
        flush_pending(&app, &id, &mut pending);
    }
}

fn flush_pending(app: &AppHandle, id: &str, pending: &mut Vec<u8>) {
    if pending.is_empty() {
        return;
    }
    let data = String::from_utf8_lossy(pending).to_string();
    pending.clear();
    if let Err(e) = app.emit(
        "terminal:data",
        json!({ "terminalId": id, "data": data }),
    ) {
        log::warn!("failed to emit terminal:data for {id}: {e}");
    }
}

fn wait_pump(
    app: AppHandle,
    id: String,
    child: Arc<Mutex<Box<dyn Child + Send + Sync>>>,
    running: Arc<AtomicBool>,
) {
    loop {
        let status = {
            let mut guard = child.lock();
            match guard.try_wait() {
                Ok(Some(status)) => Some(status),
                Ok(None) => None,
                Err(e) => {
                    log::warn!("pty {id} try_wait error: {e}");
                    None
                }
            }
        };

        if let Some(status) = status {
            running.store(false, Ordering::SeqCst);
            let code: Option<i32> = if status.success() {
                Some(0)
            } else {
                let raw = status.exit_code();
                Some(raw as i32)
            };
            if let Some(state) = app.try_state::<AppState>() {
                state.pty_manager.mark_exited(&id, code);
            }
            let _ = app.emit(
                "terminal:exit",
                json!({ "terminalId": &id, "exitCode": code }),
            );
            return;
        }

        if !running.load(Ordering::SeqCst) {
            return;
        }
        thread::sleep(Duration::from_millis(100));
    }
}

/// OSC 0 / OSC 2 title parser. Scans byte streams for escape sequences of the
/// form `ESC ] (0|2) ; <title> (BEL | ESC \)` and returns the last title seen
/// in the current chunk.
struct TitleParser {
    state: TitleState,
    buf: Vec<u8>,
    code: u8,
}

enum TitleState {
    Idle,
    Esc,
    OscCode,
    Body,
    BodyEsc,
}

impl TitleParser {
    fn new() -> Self {
        Self {
            state: TitleState::Idle,
            buf: Vec::new(),
            code: 0,
        }
    }

    fn reset(&mut self) {
        self.state = TitleState::Idle;
        self.buf.clear();
        self.code = 0;
    }

    fn consume(&mut self, bytes: &[u8]) -> Option<String> {
        let mut latest: Option<String> = None;
        for &b in bytes {
            match self.state {
                TitleState::Idle => {
                    if b == 0x1B {
                        self.state = TitleState::Esc;
                    }
                }
                TitleState::Esc => {
                    if b == b']' {
                        self.state = TitleState::OscCode;
                        self.buf.clear();
                        self.code = 0;
                    } else {
                        self.state = TitleState::Idle;
                    }
                }
                TitleState::OscCode => {
                    if b.is_ascii_digit() {
                        self.code = self.code.saturating_mul(10).saturating_add(b - b'0');
                    } else if b == b';' {
                        if self.code == 0 || self.code == 2 {
                            self.state = TitleState::Body;
                            self.buf.clear();
                        } else {
                            self.reset();
                        }
                    } else {
                        self.reset();
                    }
                }
                TitleState::Body => match b {
                    0x07 => {
                        if let Ok(s) = std::str::from_utf8(&self.buf) {
                            latest = Some(s.to_string());
                        }
                        self.reset();
                    }
                    0x1B => {
                        self.state = TitleState::BodyEsc;
                    }
                    _ => {
                        if self.buf.len() < 4096 {
                            self.buf.push(b);
                        }
                    }
                },
                TitleState::BodyEsc => {
                    if b == b'\\' {
                        if let Ok(s) = std::str::from_utf8(&self.buf) {
                            latest = Some(s.to_string());
                        }
                        self.reset();
                    } else {
                        if self.buf.len() < 4096 {
                            self.buf.push(0x1B);
                            if self.buf.len() < 4096 {
                                self.buf.push(b);
                            }
                        }
                        self.state = TitleState::Body;
                    }
                }
            }
        }
        latest
    }
}
