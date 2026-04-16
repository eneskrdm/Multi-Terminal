# MultiTerminal — Inter-Module Contract

This document is the **source of truth** for every agent working on this
project. Read it **before** writing any code. Do not deviate from the names,
shapes, or file locations defined here without a coordinated change.

## Product vision

MultiTerminal is an enterprise-grade, professional multi-terminal application
for Windows (primary), macOS, and Linux. Core features:

- **Multiple tabs** at the top of the window
- **Multiple terminals per tab** via nested horizontal/vertical splits (tmux-like)
- **Theming** with ~10 built-in themes (Dracula, Nord, Tokyo Night, Catppuccin,
  One Dark, Gruvbox, Solarized Dark, Monokai Pro, GitHub Light, Ayu)
  plus a live theme editor for custom themes
- **Profiles** for different shells (PowerShell, cmd, WSL, bash, zsh, etc.)
- **Command palette** (Ctrl+Shift+P) with fuzzy search
- **Customizable keybindings**
- **Custom title bar** (decorations disabled) with native-feeling controls
- **Settings UI** with live preview
- **GPU-accelerated rendering** via xterm.js WebGL addon

Aesthetic goal: modern, polished, dark-mode-first, subtle animations,
professional feel (think Warp, Fig, Windows Terminal but nicer).

## Tech stack

- **Frontend:** React 18 + TypeScript (strict) + Vite 6
- **State:** Zustand (with `immer` middleware where it helps)
- **Styling:** Hand-written CSS with CSS variables. No Tailwind, no CSS-in-JS
  runtime. `clsx` for conditional classes.
- **Icons:** `lucide-react`
- **Animations:** `framer-motion`
- **Terminal emulator:** `@xterm/xterm` + addons (`fit`, `web-links`, `webgl`,
  `search`, `unicode11`, `serialize`, `clipboard`)
- **Command palette:** `cmdk`
- **Backend:** Rust + Tauri 2.x
- **PTY:** `portable-pty` 0.8
- **IDs:** `nanoid` on the frontend, `uuid::Uuid::new_v4()` on the backend

## Repository layout

```
multiterminal/
├── index.html, vite.config.ts, tsconfig*.json, package.json   ← provided
├── CONTRACT.md                                                 ← this file
├── src/
│   ├── main.tsx, vite-env.d.ts                                 ← provided
│   ├── App.tsx                                   (Agent 2: AppShell)
│   ├── types/index.ts                            ← provided (DO NOT MODIFY)
│   ├── lib/
│   │   ├── tauri.ts                              ← provided IPC wrapper
│   │   ├── events.ts                             (Agent 5)
│   │   └── commands.ts                           (Agent 8)
│   ├── store/
│   │   ├── index.ts                              (Agent 4)
│   │   ├── terminals.ts                          (Agent 4)
│   │   ├── tabs.ts                               (Agent 4)
│   │   ├── layout.ts                             (Agent 4)
│   │   ├── themes.ts                             (Agent 6)
│   │   └── settings.ts                           (Agent 7)
│   ├── themes/                                    (Agent 6)
│   │   ├── index.ts
│   │   └── *.ts  (one per built-in theme)
│   ├── components/
│   │   ├── AppShell/                              (Agent 2)
│   │   ├── TitleBar/                              (Agent 9)
│   │   ├── TabBar/                                (Agent 3)
│   │   ├── Terminal/                              (Agent 5)
│   │   ├── SplitPane/                             (Agent 5)
│   │   ├── CommandPalette/                        (Agent 8)
│   │   ├── Settings/                              (Agent 7)
│   │   ├── ThemeEditor/                           (Agent 6)
│   │   ├── StatusBar/                             (Agent 9)
│   │   ├── ContextMenu/                           (Agent 9)
│   │   └── common/                                (Agent 10)
│   ├── hooks/
│   │   ├── useHotkeys.ts                          (Agent 8)
│   │   └── useContextMenu.ts                      (Agent 9)
│   └── styles/                                    (Agent 10)
│       ├── globals.css
│       ├── reset.css
│       ├── variables.css
│       ├── scrollbar.css
│       └── animations.css
└── src-tauri/
    ├── Cargo.toml, tauri.conf.json, build.rs, capabilities/*   ← provided
    ├── src/main.rs                               ← provided
    └── src/                                       (Agent 1)
        ├── lib.rs
        ├── error.rs
        ├── state.rs
        ├── pty/
        │   ├── mod.rs
        │   └── manager.rs
        ├── commands/
        │   ├── mod.rs
        │   ├── terminal.rs
        │   ├── settings.rs
        │   ├── shell.rs
        │   └── window.rs
        └── config/
            ├── mod.rs
            └── defaults.rs
```

**File ownership is strict.** If an agent needs a file outside its directory,
it must either (a) the file is already provided as scaffolding, or (b) the
agent leaves a clear TODO comment explaining what integration point is needed.

## Tauri command contract

All commands use **snake_case** on the Rust side and the exact same name from
the frontend. All take a single JSON object argument. Frontend wrappers live
in `src/lib/tauri.ts` (already written — use them, don't call `invoke`
directly from components).

| Command | Args | Returns |
|---|---|---|
| `terminal_create` | `{ profile: Profile, cols: u16, rows: u16 }` | `TerminalProcess` |
| `terminal_write`  | `{ id: String, data: String }` | `()` |
| `terminal_resize` | `{ id: String, cols: u16, rows: u16 }` | `()` |
| `terminal_kill`   | `{ id: String }` | `()` |
| `terminal_list`   | `{}` | `Vec<TerminalProcess>` |
| `settings_load`   | `{}` | `Settings` |
| `settings_save`   | `{ settings: Settings }` | `()` |
| `shell_detect_default` | `{}` | `Profile` |
| `shell_list_available` | `{}` | `Vec<Profile>` |
| `window_minimize` | `{}` | `()` |
| `window_toggle_maximize` | `{}` | `()` |
| `window_close`    | `{}` | `()` |
| `window_is_maximized` | `{}` | `bool` |

## Events emitted by backend

| Event | Payload | Notes |
|---|---|---|
| `terminal:data`  | `{ terminalId, data }` | High-frequency — backend should batch stdout reads into chunks. |
| `terminal:exit`  | `{ terminalId, exitCode }` | Emitted once when the process exits. |
| `terminal:title` | `{ terminalId, title }` | Emitted when OSC 0 / OSC 2 sequence sets a new title. |

Frontend subscribes via the helpers `onTerminalData`, `onTerminalExit`,
`onTerminalTitle` from `src/lib/tauri.ts`.

## Zustand store shapes

Do not diverge from these. Export each store's hook (e.g., `useTabsStore`).

### `useTerminalsStore` (`src/store/terminals.ts`)
```ts
{
  terminals: Record<string, TerminalProcess>;
  addTerminal(t: TerminalProcess): void;
  updateTerminal(id: string, patch: Partial<TerminalProcess>): void;
  removeTerminal(id: string): void;
  getTerminal(id: string): TerminalProcess | undefined;
}
```

### `useTabsStore` (`src/store/tabs.ts`)
```ts
{
  tabs: Tab[];
  activeTabId: string | null;
  setActiveTab(id: string): void;
  addTab(tab: Tab): void;
  removeTab(id: string): void;
  reorderTabs(fromIndex: number, toIndex: number): void;
  renameTab(id: string, title: string): void;
  updateTab(id: string, patch: Partial<Tab>): void;
  // High-level actions that orchestrate terminal + pane creation:
  createTabWithProfile(profile: Profile): Promise<string>; // returns new tab id
  closeTab(id: string): Promise<void>;
}
```

### `useLayoutStore` (`src/store/layout.ts`)
```ts
{
  panes: Record<string, PaneNode>;
  setPane(pane: PaneNode): void;
  removePane(id: string): void;
  // High-level:
  splitPane(paneId: string, direction: SplitDirection, newTerminalId: string): string; // new leaf id
  closePane(paneId: string): void; // removes leaf and collapses parent split if needed
  resizeSplit(splitId: string, sizes: number[]): void;
}
```

### `useThemesStore` (`src/store/themes.ts`)
```ts
{
  builtInThemes: Theme[];
  customThemes: Theme[];
  activeThemeId: string;
  setActiveTheme(id: string): void;
  addCustomTheme(theme: Theme): void;
  updateCustomTheme(id: string, patch: Partial<Theme>): void;
  deleteCustomTheme(id: string): void;
  getActiveTheme(): Theme;
  getThemeById(id: string): Theme | undefined;
  allThemes(): Theme[]; // builtins + custom
}
```

### `useSettingsStore` (`src/store/settings.ts`)
```ts
{
  settings: Settings;
  isLoaded: boolean;
  load(): Promise<void>;
  save(): Promise<void>;
  update(patch: Partial<Settings>): void; // auto-saves
  updateProfile(id: string, patch: Partial<Profile>): void;
  addProfile(profile: Profile): void;
  deleteProfile(id: string): void;
  setKeybinding(commandId: CommandId, accelerator: string | null): void;
  reset(): void;
}
```

## Event bus (`src/lib/events.ts`)

A tiny pub/sub used for commands that cross component boundaries without
going through the store (e.g., "focus active terminal", "paste to active
terminal"). Agent 5 writes it.

```ts
type AppEvent =
  | { type: "focus-active-terminal" }
  | { type: "terminal-zoom"; delta: number }
  | { type: "terminal-zoom-reset" }
  | { type: "terminal-clear" }
  | { type: "terminal-search" }
  | { type: "terminal-copy" }
  | { type: "terminal-paste" }
  | { type: "terminal-select-all" };

export function emit(event: AppEvent): void;
export function on<T extends AppEvent["type"]>(
  type: T,
  handler: (e: Extract<AppEvent, { type: T }>) => void,
): () => void;
```

## Command registry (`src/lib/commands.ts`)

All `CommandId` values from `types/index.ts` must have an entry here with
label, category, and default accelerator. Agent 8 writes this file and the
`useHotkeys` hook that registers global shortcuts. Other modules `execute(id)`
rather than reinventing key handling.

## CSS variables (owned by Agent 10, read by everyone)

All UI colors come from CSS variables set by the theme system on `:root`:

```
--mt-bg-base, --mt-bg-surface, --mt-bg-elevated, --mt-bg-overlay,
--mt-bg-hover, --mt-bg-active,
--mt-border-subtle, --mt-border-default, --mt-border-strong,
--mt-text-primary, --mt-text-secondary, --mt-text-muted, --mt-text-inverted,
--mt-accent, --mt-accent-hover, --mt-accent-muted, --mt-accent-contrast,
--mt-success, --mt-warning, --mt-danger, --mt-info,
--mt-titlebar-bg, --mt-titlebar-fg,
--mt-tab-active-bg, --mt-tab-inactive-bg, --mt-tab-hover-bg, --mt-tab-border,
--mt-font-family, --mt-font-size, --mt-line-height,
--mt-radius-sm, --mt-radius-md, --mt-radius-lg,
--mt-shadow-sm, --mt-shadow-md, --mt-shadow-lg,
--mt-transition-fast, --mt-transition-normal,
--mt-titlebar-height, --mt-tabbar-height, --mt-statusbar-height
```

Agent 6 applies the active theme by writing colors into these variables on
`document.documentElement`.

## Coding rules (everyone)

- **TypeScript strict mode.** No `any` unless truly necessary and commented.
- **No default exports** for components — use named exports + `index.ts`
  re-exports. e.g.,
  `src/components/TabBar/TabBar.tsx` exports `export function TabBar(...)`,
  `src/components/TabBar/index.ts` re-exports `export * from "./TabBar"`.
- **Components are pure + hook-driven.** State goes through Zustand stores.
- **CSS:** one `.css` file next to the component (e.g., `TabBar.css`).
  Imported at the top of the component file.
- **Keep files small.** Split into subfiles within the folder if needed.
- **No comments explaining what the code does** — only write comments for
  non-obvious "why" (hidden constraint, specific bug workaround, unusual
  invariant).
- **Imports:** use `@/...` alias for anything under `src/`. Use relative
  imports only within the same component folder.
- **Error handling:** only at boundaries (IPC, user input). Internal code
  trusts itself.

## Quality expectations

This is an enterprise-grade app. That means:
- Every interaction has a visual response (hover, focus, active states)
- Animations are subtle and consistent (use CSS variables for durations)
- Keyboard navigation works everywhere
- Dark mode is the default and looks stunning
- No half-finished features — if you add a button, it must work
- No placeholder / lorem ipsum text
