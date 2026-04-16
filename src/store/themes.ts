import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Theme } from "@/types";
import { builtInThemes } from "@/themes";

const CUSTOM_THEMES_KEY = "multiterminal:custom-themes";
const ACTIVE_THEME_KEY = "multiterminal:active-theme";

const DEFAULT_ACTIVE_ID = "tokyo-night";

function readCustomThemes(): Theme[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_THEMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isTheme);
  } catch {
    return [];
  }
}

function writeCustomThemes(themes: Theme[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes));
  } catch {
    // localStorage may be disabled or full — silently ignore.
  }
}

function readActiveThemeId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_THEME_KEY);
  } catch {
    return null;
  }
}

function writeActiveThemeId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVE_THEME_KEY, id);
  } catch {
    // ignore
  }
}

function isTheme(value: unknown): value is Theme {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<Theme>;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.isDark === "boolean" &&
    !!v.terminal &&
    !!v.ui
  );
}

export function applyThemeToDom(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const { ui } = theme;

  root.style.setProperty("--mt-bg-base", ui.bgBase);
  root.style.setProperty("--mt-bg-surface", ui.bgSurface);
  root.style.setProperty("--mt-bg-elevated", ui.bgElevated);
  root.style.setProperty("--mt-bg-overlay", ui.bgOverlay);
  root.style.setProperty("--mt-bg-hover", ui.bgHover);
  root.style.setProperty("--mt-bg-active", ui.bgActive);

  root.style.setProperty("--mt-border-subtle", ui.borderSubtle);
  root.style.setProperty("--mt-border-default", ui.borderDefault);
  root.style.setProperty("--mt-border-strong", ui.borderStrong);

  root.style.setProperty("--mt-text-primary", ui.textPrimary);
  root.style.setProperty("--mt-text-secondary", ui.textSecondary);
  root.style.setProperty("--mt-text-muted", ui.textMuted);
  root.style.setProperty("--mt-text-inverted", ui.textInverted);

  root.style.setProperty("--mt-accent", ui.accent);
  root.style.setProperty("--mt-accent-hover", ui.accentHover);
  root.style.setProperty("--mt-accent-muted", ui.accentMuted);
  root.style.setProperty("--mt-accent-contrast", ui.accentContrast);
  root.style.setProperty("--mt-success", ui.success);
  root.style.setProperty("--mt-warning", ui.warning);
  root.style.setProperty("--mt-danger", ui.danger);
  root.style.setProperty("--mt-info", ui.info);

  root.style.setProperty("--mt-titlebar-bg", ui.titlebarBg);
  root.style.setProperty("--mt-titlebar-fg", ui.titlebarFg);
  root.style.setProperty("--mt-tab-active-bg", ui.tabActiveBg);
  root.style.setProperty("--mt-tab-inactive-bg", ui.tabInactiveBg);
  root.style.setProperty("--mt-tab-hover-bg", ui.tabHoverBg);
  root.style.setProperty("--mt-tab-border", ui.tabBorder);

  root.dataset.theme = theme.id;
  root.dataset.themeMode = theme.isDark ? "dark" : "light";
  root.style.colorScheme = theme.isDark ? "dark" : "light";
}

export interface ThemesState {
  builtInThemes: Theme[];
  customThemes: Theme[];
  activeThemeId: string;
  setActiveTheme: (id: string) => void;
  addCustomTheme: (theme: Theme) => void;
  updateCustomTheme: (id: string, patch: Partial<Theme>) => void;
  deleteCustomTheme: (id: string) => void;
  setCustomThemes: (themes: Theme[]) => void;
  getActiveTheme: () => Theme;
  getThemeById: (id: string) => Theme | undefined;
  allThemes: () => Theme[];
  hydrate: () => void;
}

function resolveInitialActiveId(custom: Theme[]): string {
  const stored = readActiveThemeId();
  const pool = [...builtInThemes, ...custom];
  if (stored && pool.some((t) => t.id === stored)) return stored;
  return DEFAULT_ACTIVE_ID;
}

export const useThemesStore = create<ThemesState>()(
  immer((set, get) => {
    const initialCustom = readCustomThemes();
    const initialActiveId = resolveInitialActiveId(initialCustom);

    return {
      builtInThemes,
      customThemes: initialCustom,
      activeThemeId: initialActiveId,

      setActiveTheme: (id) => {
        const theme = get().getThemeById(id);
        if (!theme) return;
        set((state) => {
          state.activeThemeId = id;
        });
        writeActiveThemeId(id);
        applyThemeToDom(theme);
      },

      addCustomTheme: (theme) => {
        set((state) => {
          state.customThemes.push(theme);
        });
        writeCustomThemes(get().customThemes);
      },

      updateCustomTheme: (id, patch) => {
        set((state) => {
          const idx = state.customThemes.findIndex((t) => t.id === id);
          if (idx === -1) return;
          state.customThemes[idx] = {
            ...state.customThemes[idx],
            ...patch,
            id: state.customThemes[idx].id,
          };
        });
        writeCustomThemes(get().customThemes);
        if (get().activeThemeId === id) {
          const theme = get().getThemeById(id);
          if (theme) applyThemeToDom(theme);
        }
      },

      deleteCustomTheme: (id) => {
        const wasActive = get().activeThemeId === id;
        set((state) => {
          state.customThemes = state.customThemes.filter((t) => t.id !== id);
          if (wasActive) state.activeThemeId = DEFAULT_ACTIVE_ID;
        });
        writeCustomThemes(get().customThemes);
        if (wasActive) {
          const fallback = get().getThemeById(DEFAULT_ACTIVE_ID);
          if (fallback) {
            writeActiveThemeId(DEFAULT_ACTIVE_ID);
            applyThemeToDom(fallback);
          }
        }
      },

      setCustomThemes: (themes) => {
        set((state) => {
          state.customThemes = themes;
        });
        writeCustomThemes(themes);
        const active = get().getThemeById(get().activeThemeId);
        if (active) applyThemeToDom(active);
      },

      getActiveTheme: () => {
        const { activeThemeId } = get();
        const theme = get().getThemeById(activeThemeId);
        return theme ?? builtInThemes[0];
      },

      getThemeById: (id) => {
        const all = [...get().builtInThemes, ...get().customThemes];
        return all.find((t) => t.id === id);
      },

      allThemes: () => [...get().builtInThemes, ...get().customThemes],

      hydrate: () => {
        const customs = readCustomThemes();
        const storedId = readActiveThemeId();
        set((state) => {
          state.customThemes = customs;
          const pool = [...state.builtInThemes, ...customs];
          if (storedId && pool.some((t) => t.id === storedId)) {
            state.activeThemeId = storedId;
          }
        });
        const active = get().getThemeById(get().activeThemeId);
        if (active) applyThemeToDom(active);
      },
    };
  }),
);

// Apply the initial active theme immediately on module load so first paint
// uses the correct colors. Runs exactly once per page load.
if (typeof document !== "undefined") {
  const initial = useThemesStore.getState().getActiveTheme();
  applyThemeToDom(initial);
}
