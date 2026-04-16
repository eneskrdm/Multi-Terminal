import { create } from "zustand";
import type { CommandDescriptor, CommandId, PaneNode, PaneNodeLeaf } from "@/types";
import { useSettingsStore } from "@/store/settings";
import { useTabsStore } from "@/store/tabs";
import { useLayoutStore } from "@/store/layout";
import { emit } from "@/lib/events";
import { windowClose, windowToggleMaximize } from "@/lib/tauri";

// ----------------------------------------------------------------------------
// UI store (colocated here to avoid a tiny extra file) — toggles for global
// overlays driven by commands.
// ----------------------------------------------------------------------------
export interface UIState {
  paletteOpen: boolean;
  settingsOpen: boolean;
  themeEditorOpen: boolean;
  newTabDialogOpen: boolean;
  setPalette: (open: boolean) => void;
  setSettings: (open: boolean) => void;
  setThemeEditor: (open: boolean) => void;
  setNewTabDialog: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  paletteOpen: false,
  settingsOpen: false,
  themeEditorOpen: false,
  newTabDialogOpen: false,
  setPalette: (open) => set({ paletteOpen: open }),
  setSettings: (open) => set({ settingsOpen: open }),
  setThemeEditor: (open) => set({ themeEditorOpen: open }),
  setNewTabDialog: (open) => set({ newTabDialogOpen: open }),
}));

// ----------------------------------------------------------------------------
// Command registry
// ----------------------------------------------------------------------------
export const commandRegistry: CommandDescriptor[] = [
  // --- Tabs ---
  {
    id: "tab.new",
    label: "New Tab",
    category: "Tab",
    defaultKey: "Ctrl+T",
    icon: "Plus",
    description: "Open a new tab with the default profile",
  },
  {
    id: "tab.newWithProfile",
    label: "New Tab with Profile…",
    category: "Tab",
    defaultKey: "Ctrl+Shift+T",
    icon: "FilePlus",
    description: "Open a new tab choosing a specific profile",
  },
  {
    id: "tab.close",
    label: "Close Tab",
    category: "Tab",
    defaultKey: "Ctrl+W",
    icon: "X",
    description: "Close the active tab",
  },
  {
    id: "tab.closeOthers",
    label: "Close Other Tabs",
    category: "Tab",
    icon: "XSquare",
    description: "Close every tab except the active one",
  },
  {
    id: "tab.next",
    label: "Next Tab",
    category: "Tab",
    defaultKey: "Ctrl+Tab",
    icon: "ChevronRight",
    description: "Switch to the next tab",
  },
  {
    id: "tab.prev",
    label: "Previous Tab",
    category: "Tab",
    defaultKey: "Ctrl+Shift+Tab",
    icon: "ChevronLeft",
    description: "Switch to the previous tab",
  },
  {
    id: "tab.switch1",
    label: "Switch to Tab 1",
    category: "Tab",
    defaultKey: "Alt+1",
    icon: "Hash",
    description: "Activate the first tab",
  },
  {
    id: "tab.switch2",
    label: "Switch to Tab 2",
    category: "Tab",
    defaultKey: "Alt+2",
    icon: "Hash",
    description: "Activate the second tab",
  },
  {
    id: "tab.switch3",
    label: "Switch to Tab 3",
    category: "Tab",
    defaultKey: "Alt+3",
    icon: "Hash",
    description: "Activate the third tab",
  },
  {
    id: "tab.switch4",
    label: "Switch to Tab 4",
    category: "Tab",
    defaultKey: "Alt+4",
    icon: "Hash",
    description: "Activate the fourth tab",
  },
  {
    id: "tab.switch5",
    label: "Switch to Tab 5",
    category: "Tab",
    defaultKey: "Alt+5",
    icon: "Hash",
    description: "Activate the fifth tab",
  },
  {
    id: "tab.switch6",
    label: "Switch to Tab 6",
    category: "Tab",
    defaultKey: "Alt+6",
    icon: "Hash",
    description: "Activate the sixth tab",
  },
  {
    id: "tab.switch7",
    label: "Switch to Tab 7",
    category: "Tab",
    defaultKey: "Alt+7",
    icon: "Hash",
    description: "Activate the seventh tab",
  },
  {
    id: "tab.switch8",
    label: "Switch to Tab 8",
    category: "Tab",
    defaultKey: "Alt+8",
    icon: "Hash",
    description: "Activate the eighth tab",
  },
  {
    id: "tab.switch9",
    label: "Switch to Tab 9",
    category: "Tab",
    defaultKey: "Alt+9",
    icon: "Hash",
    description: "Activate the ninth tab",
  },
  {
    id: "tab.rename",
    label: "Rename Tab",
    category: "Tab",
    defaultKey: "F2",
    icon: "Pencil",
    description: "Rename the active tab",
  },

  // --- Panes ---
  {
    id: "pane.splitHorizontal",
    label: "Split Pane Horizontally",
    category: "Pane",
    defaultKey: "Ctrl+Shift+D",
    icon: "SplitSquareHorizontal",
    description: "Split the active pane into left and right",
  },
  {
    id: "pane.splitVertical",
    label: "Split Pane Vertically",
    category: "Pane",
    defaultKey: "Ctrl+Shift+E",
    icon: "SplitSquareVertical",
    description: "Split the active pane into top and bottom",
  },
  {
    id: "pane.close",
    label: "Close Pane",
    category: "Pane",
    defaultKey: "Ctrl+Shift+W",
    icon: "XCircle",
    description: "Close the active pane",
  },
  {
    id: "pane.focusLeft",
    label: "Focus Pane Left",
    category: "Pane",
    defaultKey: "Alt+Left",
    icon: "ArrowLeft",
    description: "Move focus to the pane to the left",
  },
  {
    id: "pane.focusRight",
    label: "Focus Pane Right",
    category: "Pane",
    defaultKey: "Alt+Right",
    icon: "ArrowRight",
    description: "Move focus to the pane to the right",
  },
  {
    id: "pane.focusUp",
    label: "Focus Pane Up",
    category: "Pane",
    defaultKey: "Alt+Up",
    icon: "ArrowUp",
    description: "Move focus to the pane above",
  },
  {
    id: "pane.focusDown",
    label: "Focus Pane Down",
    category: "Pane",
    defaultKey: "Alt+Down",
    icon: "ArrowDown",
    description: "Move focus to the pane below",
  },
  {
    id: "pane.focusNext",
    label: "Focus Next Pane",
    category: "Pane",
    defaultKey: "Ctrl+Alt+Right",
    icon: "CornerDownRight",
    description: "Cycle focus to the next pane",
  },
  {
    id: "pane.focusPrev",
    label: "Focus Previous Pane",
    category: "Pane",
    defaultKey: "Ctrl+Alt+Left",
    icon: "CornerDownLeft",
    description: "Cycle focus to the previous pane",
  },
  {
    id: "pane.zoom",
    label: "Toggle Pane Zoom",
    category: "Pane",
    defaultKey: "Ctrl+Shift+Z",
    icon: "Maximize2",
    description: "Maximise the active pane within the tab",
  },

  // --- Terminal ---
  {
    id: "terminal.copy",
    label: "Copy",
    category: "Terminal",
    defaultKey: "Ctrl+Shift+C",
    icon: "Copy",
    description: "Copy the current selection",
  },
  {
    id: "terminal.paste",
    label: "Paste",
    category: "Terminal",
    defaultKey: "Ctrl+Shift+V",
    icon: "ClipboardPaste",
    description: "Paste from the clipboard",
  },
  {
    id: "terminal.selectAll",
    label: "Select All",
    category: "Terminal",
    defaultKey: "Ctrl+Shift+A",
    icon: "TextSelect",
    description: "Select all text in the active terminal",
  },
  {
    id: "terminal.clear",
    label: "Clear Terminal",
    category: "Terminal",
    defaultKey: "Ctrl+Shift+K",
    icon: "Eraser",
    description: "Clear the active terminal buffer",
  },
  {
    id: "terminal.search",
    label: "Find in Terminal",
    category: "Terminal",
    defaultKey: "Ctrl+Shift+F",
    icon: "Search",
    description: "Open the search bar in the active terminal",
  },
  {
    id: "terminal.zoomIn",
    label: "Increase Font Size",
    category: "Terminal",
    defaultKey: "Ctrl+=",
    icon: "ZoomIn",
    description: "Increase the terminal font size",
  },
  {
    id: "terminal.zoomOut",
    label: "Decrease Font Size",
    category: "Terminal",
    defaultKey: "Ctrl+-",
    icon: "ZoomOut",
    description: "Decrease the terminal font size",
  },
  {
    id: "terminal.zoomReset",
    label: "Reset Font Size",
    category: "Terminal",
    defaultKey: "Ctrl+0",
    icon: "RefreshCw",
    description: "Reset the terminal font size to the default",
  },

  // --- Application ---
  {
    id: "app.commandPalette",
    label: "Show Command Palette",
    category: "Application",
    defaultKey: "Ctrl+Shift+P",
    icon: "Command",
    description: "Open the command palette",
  },
  {
    id: "app.settings",
    label: "Open Settings",
    category: "Application",
    defaultKey: "Ctrl+,",
    icon: "Settings",
    description: "Open the settings panel",
  },
  {
    id: "app.themeSwitcher",
    label: "Switch Theme",
    category: "Application",
    defaultKey: "Ctrl+K Ctrl+T",
    icon: "Palette",
    description: "Open the theme editor to change the current theme",
  },
  {
    id: "app.toggleFullscreen",
    label: "Toggle Fullscreen",
    category: "Application",
    defaultKey: "F11",
    icon: "Maximize",
    description: "Toggle maximized window state",
  },
  {
    id: "app.reload",
    label: "Reload Window",
    category: "Application",
    // Ctrl+R conflicts with shell reverse-history-search; use Ctrl+Shift+R.
    defaultKey: "Ctrl+Shift+R",
    icon: "RotateCw",
    description: "Reload the MultiTerminal window",
  },
  {
    id: "app.quit",
    label: "Quit MultiTerminal",
    category: "Application",
    // Ctrl+Q conflicts with XON/XOFF; default is unbound and available via
    // the command palette. Users can rebind via settings.
    icon: "Power",
    description: "Close the MultiTerminal window",
  },
];

// ----------------------------------------------------------------------------
// Accelerator parsing & matching
// ----------------------------------------------------------------------------
export interface ParsedAccelerator {
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

const KEY_ALIASES: Record<string, string> = {
  esc: "escape",
  escape: "escape",
  return: "enter",
  enter: "enter",
  space: " ",
  spacebar: " ",
  plus: "=",
  minus: "-",
  del: "delete",
  delete: "delete",
  ins: "insert",
  insert: "insert",
  up: "arrowup",
  down: "arrowdown",
  left: "arrowleft",
  right: "arrowright",
  pageup: "pageup",
  pagedown: "pagedown",
  home: "home",
  end: "end",
  tab: "tab",
  backspace: "backspace",
};

function normalizeKey(raw: string): string {
  const lower = raw.trim().toLowerCase();
  if (lower in KEY_ALIASES) return KEY_ALIASES[lower];
  return lower;
}

function normalizeEventKey(e: KeyboardEvent): string {
  const key = e.key;
  if (!key) return "";
  if (key === " ") return " ";
  return key.toLowerCase();
}

export function parseAccelerator(accel: string): ParsedAccelerator {
  const parts = accel.split("+").map((p) => p.trim()).filter(Boolean);
  const result: ParsedAccelerator = {
    key: "",
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
  };
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === "ctrl" || lower === "control") {
      result.ctrl = true;
    } else if (lower === "alt" || lower === "option") {
      result.alt = true;
    } else if (lower === "shift") {
      result.shift = true;
    } else if (lower === "meta" || lower === "cmd" || lower === "command" || lower === "win") {
      result.meta = true;
    } else {
      result.key = normalizeKey(part);
    }
  }
  return result;
}

function parseAcceleratorSequence(accel: string): ParsedAccelerator[] {
  return accel
    .split(/\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map(parseAccelerator);
}

export function matchAccelerator(event: KeyboardEvent, accel: string): boolean {
  const sequence = parseAcceleratorSequence(accel);
  if (sequence.length === 0) return false;
  // Single-chord match (chord sequences handled by the hotkey hook).
  const last = sequence[sequence.length - 1];
  return matchParsed(event, last);
}

export function matchParsed(event: KeyboardEvent, parsed: ParsedAccelerator): boolean {
  if (parsed.ctrl !== event.ctrlKey) return false;
  if (parsed.alt !== event.altKey) return false;
  if (parsed.shift !== event.shiftKey) return false;
  if (parsed.meta !== event.metaKey) return false;
  const eventKey = normalizeEventKey(event);
  if (!parsed.key) return false;
  if (eventKey === parsed.key) return true;
  // Allow "=" and "+" to match each other (shift variants differ across layouts).
  if (parsed.key === "=" && (eventKey === "=" || eventKey === "+")) return true;
  if (parsed.key === "+" && (eventKey === "=" || eventKey === "+")) return true;
  return false;
}

export function parseAcceleratorChord(accel: string): ParsedAccelerator[] {
  return parseAcceleratorSequence(accel);
}

export function formatAccelerator(accel: string): string[] {
  // Returns a flat token list for a single chord (e.g. "Ctrl+Shift+P" →
  // ["Ctrl", "Shift", "P"]). Multi-chord accelerators should be split on
  // whitespace by the caller and each chord passed in separately.
  const firstChord = accel.split(/\s+/)[0] ?? "";
  return firstChord
    .split("+")
    .map((p) => p.trim())
    .filter(Boolean)
    .map(formatKeyToken);
}

function formatKeyToken(token: string): string {
  const lower = token.toLowerCase();
  const map: Record<string, string> = {
    ctrl: "Ctrl",
    control: "Ctrl",
    alt: "Alt",
    option: "Alt",
    shift: "Shift",
    meta: "Meta",
    cmd: "Cmd",
    command: "Cmd",
    win: "Win",
    escape: "Esc",
    esc: "Esc",
    arrowleft: "Left",
    arrowright: "Right",
    arrowup: "Up",
    arrowdown: "Down",
    pageup: "PgUp",
    pagedown: "PgDn",
    enter: "Enter",
    return: "Enter",
    backspace: "Backspace",
    delete: "Del",
    tab: "Tab",
    space: "Space",
    " ": "Space",
  };
  if (lower in map) return map[lower];
  if (token.length === 1) return token.toUpperCase();
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

// ----------------------------------------------------------------------------
// Pane traversal helpers
// ----------------------------------------------------------------------------
function collectLeafIds(
  rootId: string,
  panes: Record<string, PaneNode>,
): string[] {
  const out: string[] = [];
  const walk = (id: string): void => {
    const node = panes[id];
    if (!node) return;
    if (node.type === "leaf") {
      out.push(node.id);
      return;
    }
    for (const childId of node.children) walk(childId);
  };
  walk(rootId);
  return out;
}

function cyclePaneFocus(direction: "next" | "prev"): void {
  const tabsState = useTabsStore.getState();
  const activeTabId = tabsState.activeTabId;
  if (!activeTabId) return;
  const tab = tabsState.tabs.find((t) => t.id === activeTabId);
  if (!tab) return;
  const panes = useLayoutStore.getState().panes;
  const leaves = collectLeafIds(tab.rootPaneId, panes);
  if (leaves.length === 0) return;
  const currentIdx = leaves.indexOf(tab.activePaneId);
  const step = direction === "next" ? 1 : -1;
  const nextIdx =
    currentIdx === -1
      ? 0
      : (currentIdx + step + leaves.length) % leaves.length;
  const nextPaneId = leaves[nextIdx];
  useTabsStore.getState().updateTab(tab.id, { activePaneId: nextPaneId });
  emit({ type: "focus-active-terminal" });
}

function switchToTabIndex(index: number): void {
  const tabsState = useTabsStore.getState();
  const tab = tabsState.tabs[index];
  if (!tab) return;
  tabsState.setActiveTab(tab.id);
  emit({ type: "focus-active-terminal" });
}

function rotateActiveTab(direction: 1 | -1): void {
  const tabsState = useTabsStore.getState();
  const { tabs, activeTabId } = tabsState;
  if (tabs.length === 0) return;
  const current = activeTabId ? tabs.findIndex((t) => t.id === activeTabId) : -1;
  const nextIdx =
    current === -1
      ? 0
      : (current + direction + tabs.length) % tabs.length;
  tabsState.setActiveTab(tabs[nextIdx].id);
  emit({ type: "focus-active-terminal" });
}

function activeLeaf(): PaneNodeLeaf | null {
  const tabsState = useTabsStore.getState();
  const activeTabId = tabsState.activeTabId;
  if (!activeTabId) return null;
  const tab = tabsState.tabs.find((t) => t.id === activeTabId);
  if (!tab) return null;
  const pane = useLayoutStore.getState().panes[tab.activePaneId];
  if (!pane || pane.type !== "leaf") return null;
  return pane;
}

// ----------------------------------------------------------------------------
// Dispatcher
// ----------------------------------------------------------------------------
export function executeCommand(id: CommandId): void {
  switch (id) {
    case "tab.new": {
      const settings = useSettingsStore.getState().settings;
      const profile =
        settings.profiles.find((p) => p.id === settings.defaultProfileId) ??
        settings.profiles[0];
      if (!profile) return;
      void useTabsStore.getState().createTabWithProfile(profile);
      return;
    }
    case "tab.newWithProfile": {
      useUIStore.getState().setNewTabDialog(true);
      return;
    }
    case "tab.close": {
      const activeTabId = useTabsStore.getState().activeTabId;
      if (!activeTabId) return;
      void useTabsStore.getState().closeTab(activeTabId);
      return;
    }
    case "tab.closeOthers": {
      const { tabs, activeTabId } = useTabsStore.getState();
      if (!activeTabId) return;
      const others = tabs.filter((t) => t.id !== activeTabId).map((t) => t.id);
      const closeTab = useTabsStore.getState().closeTab;
      void Promise.all(others.map((tid) => closeTab(tid)));
      return;
    }
    case "tab.next":
      rotateActiveTab(1);
      return;
    case "tab.prev":
      rotateActiveTab(-1);
      return;
    case "tab.switch1":
      switchToTabIndex(0);
      return;
    case "tab.switch2":
      switchToTabIndex(1);
      return;
    case "tab.switch3":
      switchToTabIndex(2);
      return;
    case "tab.switch4":
      switchToTabIndex(3);
      return;
    case "tab.switch5":
      switchToTabIndex(4);
      return;
    case "tab.switch6":
      switchToTabIndex(5);
      return;
    case "tab.switch7":
      switchToTabIndex(6);
      return;
    case "tab.switch8":
      switchToTabIndex(7);
      return;
    case "tab.switch9":
      switchToTabIndex(8);
      return;
    case "tab.rename": {
      const activeTabId = useTabsStore.getState().activeTabId;
      if (!activeTabId) return;
      window.dispatchEvent(
        new CustomEvent("mt:tab-rename", { detail: { tabId: activeTabId } }),
      );
      return;
    }
    case "pane.splitHorizontal":
      emit({ type: "pane-split", direction: "horizontal" });
      return;
    case "pane.splitVertical":
      emit({ type: "pane-split", direction: "vertical" });
      return;
    case "pane.close":
      emit({ type: "pane-close" });
      return;
    case "pane.focusLeft":
      emit({ type: "pane-focus", direction: "left" });
      return;
    case "pane.focusRight":
      emit({ type: "pane-focus", direction: "right" });
      return;
    case "pane.focusUp":
      emit({ type: "pane-focus", direction: "up" });
      return;
    case "pane.focusDown":
      emit({ type: "pane-focus", direction: "down" });
      return;
    case "pane.focusNext":
      cyclePaneFocus("next");
      return;
    case "pane.focusPrev":
      cyclePaneFocus("prev");
      return;
    case "pane.zoom": {
      const leaf = activeLeaf();
      window.dispatchEvent(
        new CustomEvent("mt:pane-zoom", {
          detail: { paneId: leaf?.id ?? null },
        }),
      );
      return;
    }
    case "terminal.copy":
      emit({ type: "terminal-copy" });
      return;
    case "terminal.paste":
      emit({ type: "terminal-paste" });
      return;
    case "terminal.selectAll":
      emit({ type: "terminal-select-all" });
      return;
    case "terminal.clear":
      emit({ type: "terminal-clear" });
      return;
    case "terminal.search":
      emit({ type: "terminal-search" });
      return;
    case "terminal.zoomIn":
      emit({ type: "terminal-zoom", delta: 1 });
      return;
    case "terminal.zoomOut":
      emit({ type: "terminal-zoom", delta: -1 });
      return;
    case "terminal.zoomReset":
      emit({ type: "terminal-zoom-reset" });
      return;
    case "app.commandPalette": {
      const { paletteOpen, setPalette } = useUIStore.getState();
      setPalette(!paletteOpen);
      return;
    }
    case "app.settings":
      useUIStore.getState().setSettings(true);
      return;
    case "app.themeSwitcher":
      useUIStore.getState().setThemeEditor(true);
      return;
    case "app.toggleFullscreen":
      void windowToggleMaximize();
      return;
    case "app.reload":
      location.reload();
      return;
    case "app.quit":
      void windowClose();
      return;
    default: {
      // Exhaustiveness check for future CommandId additions.
      const exhaustive: never = id;
      void exhaustive;
      return;
    }
  }
}

// ----------------------------------------------------------------------------
// Recently-used commands (consumed by the palette)
// ----------------------------------------------------------------------------
const RECENT_KEY = "mt:recent-commands";
const RECENT_LIMIT = 5;

export function loadRecentCommands(): CommandId[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is CommandId => typeof v === "string") as CommandId[];
  } catch {
    return [];
  }
}

export function pushRecentCommand(id: CommandId): void {
  try {
    const current = loadRecentCommands().filter((c) => c !== id);
    current.unshift(id);
    const trimmed = current.slice(0, RECENT_LIMIT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(trimmed));
  } catch {
    // Non-fatal; recent history is a convenience only.
  }
}

// ----------------------------------------------------------------------------
// Resolved keybindings (merges settings override with defaults)
// ----------------------------------------------------------------------------
export function getEffectiveAccelerator(id: CommandId): string | null {
  const overrides = useSettingsStore.getState().settings.keybindings;
  if (id in overrides) {
    const override = overrides[id];
    // null → explicitly unbound
    if (override === null) return null;
    if (typeof override === "string" && override.length > 0) return override;
  }
  const descriptor = commandRegistry.find((c) => c.id === id);
  return descriptor?.defaultKey ?? null;
}
