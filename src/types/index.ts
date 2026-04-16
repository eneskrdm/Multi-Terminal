// ============================================================================
// Shared types for MultiTerminal.
//
// This file is the CONTRACT between frontend, backend, and all modules.
// Do not modify types here without updating all consumers. Avoid duplicating
// these types anywhere else.
// ============================================================================

// ----------------------------------------------------------------------------
// Terminal Process (mirrors the Rust `TerminalProcess` struct)
// ----------------------------------------------------------------------------
export interface TerminalProcess {
  id: string;
  pid: number | null;
  shell: string;
  args: string[];
  cwd: string;
  cols: number;
  rows: number;
  title: string;
  createdAt: number;
  exited: boolean;
  exitCode: number | null;
}

// ----------------------------------------------------------------------------
// Split layout tree
// ----------------------------------------------------------------------------
export type SplitDirection = "horizontal" | "vertical";

export interface PaneNodeLeaf {
  id: string;
  type: "leaf";
  terminalId: string;
  parentId: string | null;
}

export interface PaneNodeSplit {
  id: string;
  type: "split";
  direction: SplitDirection;
  children: string[];
  sizes: number[];
  parentId: string | null;
}

export type PaneNode = PaneNodeLeaf | PaneNodeSplit;

export interface Tab {
  id: string;
  title: string;
  rootPaneId: string;
  activePaneId: string;
  profileId: string;
  icon?: string;
  color?: string;
}

// ----------------------------------------------------------------------------
// Profiles (shell configurations)
// ----------------------------------------------------------------------------
export interface Profile {
  id: string;
  name: string;
  shell: string;
  args: string[];
  env: Record<string, string>;
  cwd?: string | null;
  icon?: string;
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  themeId?: string;
  isDefault?: boolean;
}

// ----------------------------------------------------------------------------
// Themes
// ----------------------------------------------------------------------------
export interface AnsiPalette {
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

export interface TerminalColors {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selectionBackground: string;
  selectionForeground?: string;
  ansi: AnsiPalette;
}

export interface UIColors {
  // Layered backgrounds (deepest → highest elevation)
  bgBase: string;
  bgSurface: string;
  bgElevated: string;
  bgOverlay: string;
  bgHover: string;
  bgActive: string;

  // Borders
  borderSubtle: string;
  borderDefault: string;
  borderStrong: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverted: string;

  // Semantic
  accent: string;
  accentHover: string;
  accentMuted: string;
  accentContrast: string;
  success: string;
  warning: string;
  danger: string;
  info: string;

  // Titlebar / chrome
  titlebarBg: string;
  titlebarFg: string;
  tabActiveBg: string;
  tabInactiveBg: string;
  tabHoverBg: string;
  tabBorder: string;
}

export interface Theme {
  id: string;
  name: string;
  author?: string;
  isDark: boolean;
  terminal: TerminalColors;
  ui: UIColors;
}

// ----------------------------------------------------------------------------
// Settings
// ----------------------------------------------------------------------------
export type CursorStyle = "block" | "underline" | "bar";
export type BellStyle = "none" | "sound" | "visual";
export type TabBarPosition = "top" | "bottom";
export type RightClickBehavior = "paste" | "menu" | "selectWord";

export interface Settings {
  // Appearance
  themeId: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  opacity: number;
  windowBlur: boolean;
  animations: boolean;

  // Terminal behavior
  cursorStyle: CursorStyle;
  cursorBlink: boolean;
  scrollback: number;
  bellStyle: BellStyle;
  copyOnSelect: boolean;
  rightClickBehavior: RightClickBehavior;
  wordSeparators: string;
  smoothScrolling: boolean;

  // Layout
  tabBarPosition: TabBarPosition;
  showTabBarWhenSingle: boolean;
  showStatusBar: boolean;
  confirmCloseWindow: boolean;
  confirmCloseTab: boolean;

  // Profiles
  profiles: Profile[];
  defaultProfileId: string;

  // Keybindings
  keybindings: Record<string, string | null>;

  // Advanced
  gpuAcceleration: boolean;
  webGLRendering: boolean;
  ligatures: boolean;
}

// ----------------------------------------------------------------------------
// Commands (for hotkeys + command palette)
// ----------------------------------------------------------------------------
export type CommandId =
  | "tab.new"
  | "tab.newWithProfile"
  | "tab.close"
  | "tab.closeOthers"
  | "tab.next"
  | "tab.prev"
  | "tab.switch1"
  | "tab.switch2"
  | "tab.switch3"
  | "tab.switch4"
  | "tab.switch5"
  | "tab.switch6"
  | "tab.switch7"
  | "tab.switch8"
  | "tab.switch9"
  | "tab.rename"
  | "pane.splitHorizontal"
  | "pane.splitVertical"
  | "pane.close"
  | "pane.focusLeft"
  | "pane.focusRight"
  | "pane.focusUp"
  | "pane.focusDown"
  | "pane.focusNext"
  | "pane.focusPrev"
  | "pane.zoom"
  | "terminal.copy"
  | "terminal.paste"
  | "terminal.selectAll"
  | "terminal.clear"
  | "terminal.search"
  | "terminal.zoomIn"
  | "terminal.zoomOut"
  | "terminal.zoomReset"
  | "app.commandPalette"
  | "app.settings"
  | "app.themeSwitcher"
  | "app.toggleFullscreen"
  | "app.reload"
  | "app.quit";

export interface CommandDescriptor {
  id: CommandId;
  label: string;
  category: "Tab" | "Pane" | "Terminal" | "Application";
  defaultKey?: string;
  icon?: string;
  description?: string;
}

// ----------------------------------------------------------------------------
// IPC event payloads (backend → frontend)
// ----------------------------------------------------------------------------
export interface TerminalDataEvent {
  terminalId: string;
  data: string;
}

export interface TerminalExitEvent {
  terminalId: string;
  exitCode: number | null;
}

export interface TerminalTitleEvent {
  terminalId: string;
  title: string;
}
