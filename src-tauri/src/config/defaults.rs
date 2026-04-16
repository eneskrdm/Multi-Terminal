use std::collections::HashMap;

use uuid::Uuid;

use super::{
    BellStyle, CursorStyle, Profile, RightClickBehavior, Settings, TabBarPosition,
};

pub fn default_profile() -> Profile {
    let (shell, args) = detect_default_shell();
    Profile {
        id: Uuid::new_v4().to_string(),
        name: profile_name_for_shell(&shell),
        shell,
        args,
        env: HashMap::new(),
        cwd: None,
        icon: None,
        color: None,
        font_family: None,
        font_size: None,
        theme_id: None,
        is_default: Some(true),
    }
}

pub fn default_settings() -> Settings {
    let profile = default_profile();
    let default_profile_id = profile.id.clone();

    Settings {
        theme_id: "tokyo-night".to_string(),
        font_family: "Cascadia Code".to_string(),
        font_size: 14,
        font_weight: 400,
        line_height: 1.2,
        letter_spacing: 0.0,
        opacity: 1.0,
        window_blur: false,
        animations: true,

        cursor_style: CursorStyle::Block,
        cursor_blink: true,
        scrollback: 10_000,
        bell_style: BellStyle::None,
        copy_on_select: false,
        right_click_behavior: RightClickBehavior::Menu,
        word_separators: " ()[]{}'\"`,;:|&".to_string(),
        smooth_scrolling: true,

        tab_bar_position: TabBarPosition::Top,
        show_tab_bar_when_single: true,
        show_status_bar: true,
        confirm_close_window: true,
        confirm_close_tab: false,

        profiles: vec![profile],
        default_profile_id,

        keybindings: default_keybindings(),

        gpu_acceleration: true,
        web_gl_rendering: true,
        ligatures: true,
    }
}

fn default_keybindings() -> HashMap<String, Option<String>> {
    let mut map: HashMap<String, Option<String>> = HashMap::new();

    map.insert("tab.new".into(), Some("Ctrl+T".into()));
    map.insert("tab.close".into(), Some("Ctrl+W".into()));
    map.insert("tab.next".into(), Some("Ctrl+Tab".into()));
    map.insert("tab.prev".into(), Some("Ctrl+Shift+Tab".into()));

    for i in 1..=9u8 {
        map.insert(format!("tab.switch{i}"), Some(format!("Ctrl+{i}")));
    }

    map.insert("pane.splitHorizontal".into(), Some("Ctrl+Shift+E".into()));
    map.insert("pane.splitVertical".into(), Some("Ctrl+Shift+O".into()));
    map.insert("pane.close".into(), Some("Ctrl+Shift+W".into()));
    map.insert("pane.focusLeft".into(), Some("Alt+Left".into()));
    map.insert("pane.focusRight".into(), Some("Alt+Right".into()));
    map.insert("pane.focusUp".into(), Some("Alt+Up".into()));
    map.insert("pane.focusDown".into(), Some("Alt+Down".into()));
    map.insert("pane.zoom".into(), Some("Ctrl+Shift+Z".into()));

    map.insert("terminal.copy".into(), Some("Ctrl+Shift+C".into()));
    map.insert("terminal.paste".into(), Some("Ctrl+Shift+V".into()));
    map.insert("terminal.search".into(), Some("Ctrl+Shift+F".into()));
    map.insert("terminal.clear".into(), Some("Ctrl+L".into()));
    map.insert("terminal.zoomIn".into(), Some("Ctrl+=".into()));
    map.insert("terminal.zoomOut".into(), Some("Ctrl+-".into()));
    map.insert("terminal.zoomReset".into(), Some("Ctrl+0".into()));

    map.insert("app.commandPalette".into(), Some("Ctrl+Shift+P".into()));
    map.insert("app.settings".into(), Some("Ctrl+,".into()));
    map.insert("app.themeSwitcher".into(), Some("Ctrl+K Ctrl+T".into()));

    map
}

#[cfg(target_os = "windows")]
pub fn detect_default_shell() -> (String, Vec<String>) {
    for candidate in ["pwsh.exe", "powershell.exe", "cmd.exe"] {
        if which_exists(candidate) {
            return (candidate.to_string(), Vec::new());
        }
    }
    ("cmd.exe".to_string(), Vec::new())
}

#[cfg(not(target_os = "windows"))]
pub fn detect_default_shell() -> (String, Vec<String>) {
    if let Ok(shell) = std::env::var("SHELL") {
        if !shell.is_empty() {
            return (shell, Vec::new());
        }
    }
    for candidate in ["/bin/bash", "/bin/sh"] {
        if std::path::Path::new(candidate).exists() {
            return (candidate.to_string(), Vec::new());
        }
    }
    ("/bin/sh".to_string(), Vec::new())
}

pub fn profile_name_for_shell(shell: &str) -> String {
    let stem = std::path::Path::new(shell)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(shell)
        .to_lowercase();

    match stem.as_str() {
        "pwsh" => "PowerShell".to_string(),
        "powershell" => "Windows PowerShell".to_string(),
        "cmd" => "Command Prompt".to_string(),
        "bash" => "Bash".to_string(),
        "zsh" => "Zsh".to_string(),
        "fish" => "Fish".to_string(),
        "sh" => "Shell".to_string(),
        "nu" => "Nushell".to_string(),
        _ => {
            let mut c = stem.chars();
            match c.next() {
                Some(first) => first.to_uppercase().collect::<String>() + c.as_str(),
                None => shell.to_string(),
            }
        }
    }
}

#[cfg(target_os = "windows")]
pub fn which_exists(name: &str) -> bool {
    if let Ok(path_var) = std::env::var("PATH") {
        for dir in std::env::split_paths(&path_var) {
            let candidate = dir.join(name);
            if candidate.is_file() {
                return true;
            }
        }
    }
    false
}

#[cfg(not(target_os = "windows"))]
pub fn which_exists(name: &str) -> bool {
    if std::path::Path::new(name).is_absolute() {
        return std::path::Path::new(name).exists();
    }
    if let Ok(path_var) = std::env::var("PATH") {
        for dir in std::env::split_paths(&path_var) {
            let candidate = dir.join(name);
            if candidate.is_file() {
                return true;
            }
        }
    }
    false
}
