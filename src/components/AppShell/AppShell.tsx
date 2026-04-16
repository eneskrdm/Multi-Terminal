import {
  Component,
  useEffect,
  useMemo,
  useRef,
  type ErrorInfo,
  type ReactNode,
} from "react";
import clsx from "clsx";
import { AlertTriangle, TerminalSquare } from "lucide-react";

import { TitleBar } from "@/components/TitleBar";
import { TabBar } from "@/components/TabBar";
import { StatusBar } from "@/components/StatusBar";
import { CommandPalette } from "@/components/CommandPalette";
import { SettingsModal } from "@/components/Settings";
import { ThemeEditor } from "@/components/ThemeEditor";
import { SplitPaneTree } from "@/components/SplitPane";
import { NewTabDialog } from "@/components/NewTabDialog";

import { useSettingsStore } from "@/store/settings";
import { useThemesStore } from "@/store/themes";
import { useTabsStore } from "@/store/tabs";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useUIStore } from "@/lib/commands";

import type { Profile } from "@/types";

import "./AppShell.css";

// ----------------------------------------------------------------------------
// Error boundary — keeps the whole shell alive if a child throws.
// ----------------------------------------------------------------------------
interface ErrorBoundaryState {
  error: Error | null;
}

class AppShellErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface to the host so the renderer/debugger can catch it.
    // eslint-disable-next-line no-console
    console.error("[AppShell] Uncaught render error:", error, info);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="mt-app-shell__error" role="alert">
          <div className="mt-app-shell__error-card">
            <h2 className="mt-app-shell__error-title">
              <AlertTriangle size={16} aria-hidden="true" />
              Something went wrong
            </h2>
            <p className="mt-app-shell__error-message">
              MultiTerminal hit an unexpected error while rendering. You can try
              reloading the window — your shells will be reconnected.
            </p>
            <pre className="mt-app-shell__error-stack">
              {this.state.error.stack ?? this.state.error.message}
            </pre>
            <button
              type="button"
              className="mt-app-shell__empty-button"
              onClick={this.handleReload}
            >
              Reload window
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ----------------------------------------------------------------------------
// Startup orchestration:
//   1. Load settings from disk.
//   2. Once loaded, sync theme -> CSS variables.
//   3. Ensure at least one tab exists (seed from defaultProfile).
// The bootstrap only runs once per mount even under StrictMode double-invoke.
// ----------------------------------------------------------------------------
function useAppBootstrap(): { isReady: boolean } {
  const isLoaded = useSettingsStore((s) => s.isLoaded);
  const didInitRef = useRef(false);
  const didSeedTabRef = useRef(false);
  const didApplyThemeRef = useRef<string | null>(null);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    void useSettingsStore.getState().load();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const settings = useSettingsStore.getState().settings;
    const themesStore = useThemesStore.getState();

    if (didApplyThemeRef.current !== settings.themeId) {
      themesStore.setActiveTheme(settings.themeId);
      didApplyThemeRef.current = settings.themeId;
    }

    if (didSeedTabRef.current) return;
    const tabsStore = useTabsStore.getState();
    if (tabsStore.tabs.length > 0) {
      didSeedTabRef.current = true;
      return;
    }

    const defaultProfile = pickDefaultProfile(settings.profiles, settings.defaultProfileId);
    if (!defaultProfile) {
      // No profile available yet — the user will see the empty state and can
      // spawn a terminal from there once profiles are populated.
      return;
    }

    didSeedTabRef.current = true;
    void tabsStore.createTabWithProfile(defaultProfile);
  }, [isLoaded]);

  // Keep theme in sync if user changes it at runtime (from Settings / Theme
  // switcher). Cheap: only subscribes to themeId.
  const activeThemeId = useSettingsStore((s) =>
    s.isLoaded ? s.settings.themeId : null,
  );
  useEffect(() => {
    if (!activeThemeId) return;
    if (didApplyThemeRef.current === activeThemeId) return;
    useThemesStore.getState().setActiveTheme(activeThemeId);
    didApplyThemeRef.current = activeThemeId;
  }, [activeThemeId]);

  return { isReady: isLoaded };
}

function pickDefaultProfile(
  profiles: Profile[],
  defaultProfileId: string,
): Profile | undefined {
  if (!profiles || profiles.length === 0) return undefined;
  return (
    profiles.find((p) => p.id === defaultProfileId) ??
    profiles.find((p) => p.isDefault) ??
    profiles[0]
  );
}

// ----------------------------------------------------------------------------
// Boot screen — short-lived, while settings hydrate from disk.
// ----------------------------------------------------------------------------
function BootScreen(): JSX.Element {
  return (
    <div className="mt-app-shell__boot" role="status" aria-live="polite">
      <div className="mt-app-shell__boot-inner">
        <div className="mt-app-shell__boot-spinner" aria-hidden="true" />
        <span>Starting Multi-Terminal</span>
      </div>
      <div className="mt-app-shell__boot-attribution" aria-hidden="true">
        by Enes Karademir
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Empty state — shown when there is no active tab (e.g., user closed them all).
// ----------------------------------------------------------------------------
function EmptyState(): JSX.Element {
  const createTab = useTabsStore((s) => s.createTabWithProfile);
  const profiles = useSettingsStore((s) => s.settings.profiles);
  const defaultProfileId = useSettingsStore((s) => s.settings.defaultProfileId);

  const defaultProfile = useMemo(
    () => pickDefaultProfile(profiles, defaultProfileId),
    [profiles, defaultProfileId],
  );

  const handleOpen = (): void => {
    if (!defaultProfile) return;
    void createTab(defaultProfile);
  };

  return (
    <div className="mt-app-shell__empty" role="region" aria-label="No terminal open">
      <h1 className="mt-app-shell__empty-title">No terminal open</h1>
      <p className="mt-app-shell__empty-hint">
        All tabs are closed. Open a new terminal to get started — or press
        Ctrl+Shift+T to spawn one with your default profile.
      </p>
      <div className="mt-app-shell__empty-actions">
        <button
          type="button"
          className="mt-app-shell__empty-button"
          onClick={handleOpen}
          disabled={!defaultProfile}
        >
          <TerminalSquare size={14} aria-hidden="true" />
          Open a new terminal
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Wire global SettingsModal / ThemeEditor visibility to the UI store so that
// the command palette + status bar can open them.
// ----------------------------------------------------------------------------
function GlobalSettingsModal(): JSX.Element {
  const open = useUIStore((s) => s.settingsOpen);
  const setOpen = useUIStore((s) => s.setSettings);
  return <SettingsModal isOpen={open} onClose={() => setOpen(false)} />;
}

function GlobalThemeEditor(): JSX.Element {
  const open = useUIStore((s) => s.themeEditorOpen);
  const setOpen = useUIStore((s) => s.setThemeEditor);
  return <ThemeEditor isOpen={open} onClose={() => setOpen(false)} />;
}

// Bridge the CustomEvents dispatched by StatusBar and other legacy call sites
// to the UI store so everything ends up in one place.
function useUIEventBridge(): void {
  const setSettings = useUIStore((s) => s.setSettings);
  const setThemeEditor = useUIStore((s) => s.setThemeEditor);
  useEffect(() => {
    const openSettings = (): void => setSettings(true);
    const openThemeEditor = (): void => setThemeEditor(true);
    window.addEventListener("multiterminal:open-settings", openSettings);
    window.addEventListener("multiterminal:open-theme-editor", openThemeEditor);
    return () => {
      window.removeEventListener("multiterminal:open-settings", openSettings);
      window.removeEventListener("multiterminal:open-theme-editor", openThemeEditor);
    };
  }, [setSettings, setThemeEditor]);
}

// ----------------------------------------------------------------------------
// AppShell — the top-level chrome.
// ----------------------------------------------------------------------------
export function AppShell(): JSX.Element {
  const { isReady } = useAppBootstrap();

  // Register global hotkeys. Owned by Agent 8 — we just invoke it once the
  // shell mounts.
  useHotkeys();
  useUIEventBridge();

  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const showTabBarWhenSingle = useSettingsStore(
    (s) => s.settings.showTabBarWhenSingle,
  );
  const showStatusBar = useSettingsStore((s) => s.settings.showStatusBar);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? null,
    [tabs, activeTabId],
  );

  const tabBarHidden = !showTabBarWhenSingle && tabs.length <= 1;
  const statusBarHidden = !showStatusBar;

  if (!isReady) {
    return <BootScreen />;
  }

  return (
    <AppShellErrorBoundary>
      <div
        className={clsx("mt-app-shell", {
          "mt-app-shell--no-tabbar": tabBarHidden,
          "mt-app-shell--no-statusbar": statusBarHidden,
        })}
      >
        <div className="mt-app-shell__titlebar-slot">
          <TitleBar />
        </div>

        <div
          className="mt-app-shell__tabbar-slot"
          aria-hidden={tabBarHidden}
          style={tabBarHidden ? { visibility: "hidden" } : undefined}
        >
          {!tabBarHidden && <TabBar />}
        </div>

        <main className="mt-app-shell__main-slot">
          {activeTab ? (
            <SplitPaneTree rootPaneId={activeTab.rootPaneId} />
          ) : (
            <EmptyState />
          )}
        </main>

        <div
          className="mt-app-shell__statusbar-slot"
          aria-hidden={statusBarHidden}
          style={statusBarHidden ? { visibility: "hidden" } : undefined}
        >
          {!statusBarHidden && <StatusBar />}
        </div>

        <div className="mt-app-shell__modal-layer">
          <CommandPalette />
          <GlobalSettingsModal />
          <GlobalThemeEditor />
          <NewTabDialog />
        </div>
      </div>
    </AppShellErrorBoundary>
  );
}
