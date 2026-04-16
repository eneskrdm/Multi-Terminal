use std::collections::HashMap;

use uuid::Uuid;

use crate::config::{defaults, Profile};

#[tauri::command]
pub async fn shell_detect_default() -> std::result::Result<Profile, String> {
    let (shell, args) = defaults::detect_default_shell();
    Ok(Profile {
        id: Uuid::new_v4().to_string(),
        name: defaults::profile_name_for_shell(&shell),
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
    })
}

#[tauri::command]
pub async fn shell_list_available() -> std::result::Result<Vec<Profile>, String> {
    Ok(detect_all_shells())
}

#[cfg(target_os = "windows")]
fn detect_all_shells() -> Vec<Profile> {
    let mut out: Vec<Profile> = Vec::new();
    let (default_shell, _) = defaults::detect_default_shell();

    let candidates: &[(&str, &str)] = &[
        ("pwsh.exe", "PowerShell"),
        ("powershell.exe", "Windows PowerShell"),
        ("cmd.exe", "Command Prompt"),
        ("wsl.exe", "WSL"),
        ("bash.exe", "Git Bash"),
        ("nu.exe", "Nushell"),
    ];

    for (exe, name) in candidates {
        if defaults::which_exists(exe) {
            out.push(Profile {
                id: Uuid::new_v4().to_string(),
                name: (*name).to_string(),
                shell: (*exe).to_string(),
                args: Vec::new(),
                env: HashMap::new(),
                cwd: None,
                icon: None,
                color: None,
                font_family: None,
                font_size: None,
                theme_id: None,
                is_default: Some(exe.eq_ignore_ascii_case(&default_shell)),
            });
        }
    }

    out
}

#[cfg(not(target_os = "windows"))]
fn detect_all_shells() -> Vec<Profile> {
    let mut out: Vec<Profile> = Vec::new();
    let (default_shell, _) = defaults::detect_default_shell();
    let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();

    let candidates: &[&str] = &[
        "/bin/bash",
        "/bin/zsh",
        "/bin/sh",
        "/usr/bin/fish",
        "/usr/local/bin/fish",
        "/opt/homebrew/bin/fish",
        "/usr/bin/nu",
        "/usr/local/bin/nu",
    ];

    if std::path::Path::new(&default_shell).exists() && seen.insert(default_shell.clone()) {
        out.push(Profile {
            id: Uuid::new_v4().to_string(),
            name: defaults::profile_name_for_shell(&default_shell),
            shell: default_shell.clone(),
            args: Vec::new(),
            env: HashMap::new(),
            cwd: None,
            icon: None,
            color: None,
            font_family: None,
            font_size: None,
            theme_id: None,
            is_default: Some(true),
        });
    }

    for candidate in candidates {
        if !std::path::Path::new(candidate).exists() {
            continue;
        }
        if !seen.insert(candidate.to_string()) {
            continue;
        }
        out.push(Profile {
            id: Uuid::new_v4().to_string(),
            name: defaults::profile_name_for_shell(candidate),
            shell: (*candidate).to_string(),
            args: Vec::new(),
            env: HashMap::new(),
            cwd: None,
            icon: None,
            color: None,
            font_family: None,
            font_size: None,
            theme_id: None,
            is_default: Some(*candidate == default_shell),
        });
    }

    out
}
