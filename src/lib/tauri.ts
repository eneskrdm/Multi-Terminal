import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  Profile,
  Settings,
  TerminalDataEvent,
  TerminalExitEvent,
  TerminalProcess,
  TerminalTitleEvent,
} from "@/types";

// ============================================================================
// Terminal commands
// ============================================================================
export function terminalCreate(args: {
  profile: Profile;
  cols: number;
  rows: number;
}): Promise<TerminalProcess> {
  return invoke<TerminalProcess>("terminal_create", args);
}

export function terminalWrite(args: { id: string; data: string }): Promise<void> {
  return invoke("terminal_write", args);
}

export function terminalResize(args: {
  id: string;
  cols: number;
  rows: number;
}): Promise<void> {
  return invoke("terminal_resize", args);
}

export function terminalKill(args: { id: string }): Promise<void> {
  return invoke("terminal_kill", args);
}

export function terminalList(): Promise<TerminalProcess[]> {
  return invoke<TerminalProcess[]>("terminal_list");
}

// ============================================================================
// Settings commands
// ============================================================================
export function settingsLoad(): Promise<Settings> {
  return invoke<Settings>("settings_load");
}

export function settingsSave(args: { settings: Settings }): Promise<void> {
  return invoke("settings_save", args);
}

// ============================================================================
// Shell detection
// ============================================================================
export function shellDetectDefault(): Promise<Profile> {
  return invoke<Profile>("shell_detect_default");
}

export function shellListAvailable(): Promise<Profile[]> {
  return invoke<Profile[]>("shell_list_available");
}

// ============================================================================
// Window commands (custom title bar)
// ============================================================================
export function windowMinimize(): Promise<void> {
  return invoke("window_minimize");
}

export function windowToggleMaximize(): Promise<void> {
  return invoke("window_toggle_maximize");
}

export function windowClose(): Promise<void> {
  return invoke("window_close");
}

export function windowIsMaximized(): Promise<boolean> {
  return invoke<boolean>("window_is_maximized");
}

// ============================================================================
// Filesystem helpers (for the new-tab directory picker)
// ============================================================================
export function fsHomeDir(): Promise<string> {
  return invoke<string>("fs_home_dir");
}

export function fsExpandPath(args: { path: string }): Promise<string> {
  return invoke<string>("fs_expand_path", args);
}

export function fsListSubdirs(args: { path: string }): Promise<string[]> {
  return invoke<string[]>("fs_list_subdirs", args);
}

export function fsPathIsDir(args: { path: string }): Promise<boolean> {
  return invoke<boolean>("fs_path_is_dir", args);
}

// ============================================================================
// Events from backend
// ============================================================================
export const EVENT_TERMINAL_DATA = "terminal:data";
export const EVENT_TERMINAL_EXIT = "terminal:exit";
export const EVENT_TERMINAL_TITLE = "terminal:title";

export function onTerminalData(
  handler: (payload: TerminalDataEvent) => void,
): Promise<UnlistenFn> {
  return listen<TerminalDataEvent>(EVENT_TERMINAL_DATA, (e) => handler(e.payload));
}

export function onTerminalExit(
  handler: (payload: TerminalExitEvent) => void,
): Promise<UnlistenFn> {
  return listen<TerminalExitEvent>(EVENT_TERMINAL_EXIT, (e) => handler(e.payload));
}

export function onTerminalTitle(
  handler: (payload: TerminalTitleEvent) => void,
): Promise<UnlistenFn> {
  return listen<TerminalTitleEvent>(EVENT_TERMINAL_TITLE, (e) => handler(e.payload));
}
