import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { CommandId, Profile, Settings } from "@/types";
import { settingsLoad, settingsSave } from "@/lib/tauri";
import { useThemesStore } from "./themes";

export interface SettingsState {
  settings: Settings;
  isLoaded: boolean;
  load: () => Promise<void>;
  save: () => Promise<void>;
  update: (patch: Partial<Settings>) => void;
  updateProfile: (id: string, patch: Partial<Profile>) => void;
  addProfile: (profile: Profile) => void;
  deleteProfile: (id: string) => void;
  setKeybinding: (commandId: CommandId, accelerator: string | null) => void;
  reset: () => void;
}

const defaultSettings: Settings = {
  themeId: "tokyo-night",
  fontFamily: "Cascadia Code, Consolas, monospace",
  fontSize: 14,
  fontWeight: 400,
  lineHeight: 1.2,
  letterSpacing: 0,
  opacity: 1,
  windowBlur: false,
  animations: true,

  cursorStyle: "block",
  cursorBlink: true,
  scrollback: 10000,
  bellStyle: "none",
  copyOnSelect: false,
  rightClickBehavior: "menu",
  wordSeparators: " ()[]{}',\"`",
  smoothScrolling: true,

  tabBarPosition: "top",
  showTabBarWhenSingle: true,
  showStatusBar: true,
  confirmCloseWindow: true,
  confirmCloseTab: false,

  profiles: [],
  defaultProfileId: "",

  keybindings: {},

  gpuAcceleration: true,
  webGLRendering: true,
  ligatures: true,
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 300;

function scheduleSave(save: () => Promise<void>) {
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void save();
  }, SAVE_DEBOUNCE_MS);
}

export const useSettingsStore = create<SettingsState>()(
  immer((set, get) => ({
    settings: defaultSettings,
    isLoaded: false,

    load: async () => {
      try {
        const loaded = await settingsLoad();
        set((state) => {
          state.settings = loaded;
          state.isLoaded = true;
        });
        try {
          useThemesStore.getState().setActiveTheme(loaded.themeId);
        } catch {
          // Themes store may not be ready yet; safe to ignore.
        }
      } catch {
        set((state) => {
          state.isLoaded = true;
        });
      }
    },

    save: async () => {
      try {
        await settingsSave({ settings: get().settings });
      } catch {
        // Persistence failures should not crash the UI.
      }
    },

    update: (patch) => {
      set((state) => {
        Object.assign(state.settings, patch);
      });
      scheduleSave(get().save);
    },

    updateProfile: (id, patch) => {
      set((state) => {
        const profile = state.settings.profiles.find((p) => p.id === id);
        if (profile) Object.assign(profile, patch);
      });
      scheduleSave(get().save);
    },

    addProfile: (profile) => {
      set((state) => {
        state.settings.profiles.push(profile);
        if (!state.settings.defaultProfileId) {
          state.settings.defaultProfileId = profile.id;
        }
      });
      scheduleSave(get().save);
    },

    deleteProfile: (id) => {
      set((state) => {
        const idx = state.settings.profiles.findIndex((p) => p.id === id);
        if (idx === -1) return;
        state.settings.profiles.splice(idx, 1);
        if (state.settings.defaultProfileId === id) {
          state.settings.defaultProfileId =
            state.settings.profiles[0]?.id ?? "";
        }
      });
      scheduleSave(get().save);
    },

    setKeybinding: (commandId, accelerator) => {
      set((state) => {
        state.settings.keybindings[commandId] = accelerator;
      });
      scheduleSave(get().save);
    },

    reset: () => {
      set((state) => {
        state.settings = {
          ...defaultSettings,
          profiles: [],
          defaultProfileId: "",
          keybindings: {},
        };
      });
      try {
        useThemesStore.getState().setActiveTheme(defaultSettings.themeId);
      } catch {
        // No-op.
      }
      scheduleSave(get().save);
    },
  })),
);
