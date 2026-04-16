use std::path::PathBuf;

fn expand_tilde(input: &str) -> PathBuf {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    }
    if let Some(rest) = trimmed.strip_prefix('~') {
        if let Some(home) = dirs::home_dir() {
            let tail = rest.trim_start_matches(['/', '\\']);
            if tail.is_empty() {
                return home;
            }
            return home.join(tail);
        }
    }
    PathBuf::from(trimmed)
}

#[tauri::command]
pub async fn fs_home_dir() -> Result<String, String> {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().into_owned())
        .ok_or_else(|| "home directory unavailable".to_string())
}

#[tauri::command]
pub async fn fs_expand_path(path: String) -> Result<String, String> {
    Ok(expand_tilde(&path).to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn fs_list_subdirs(path: String) -> Result<Vec<String>, String> {
    let p = expand_tilde(&path);
    let rd = match std::fs::read_dir(&p) {
        Ok(rd) => rd,
        Err(_) => return Ok(Vec::new()),
    };

    let mut out: Vec<String> = rd
        .filter_map(|entry| entry.ok())
        .filter(|entry| entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false))
        .filter_map(|entry| entry.file_name().to_str().map(|s| s.to_string()))
        .collect();

    out.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
    Ok(out)
}

#[tauri::command]
pub async fn fs_path_is_dir(path: String) -> Result<bool, String> {
    Ok(expand_tilde(&path).is_dir())
}
