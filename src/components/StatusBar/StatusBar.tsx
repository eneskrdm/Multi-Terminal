import { useMemo } from "react";
import { Cpu, Folder, Palette, Rows, Terminal, Type } from "lucide-react";

import { useLayoutStore } from "@/store/layout";
import { useSettingsStore } from "@/store/settings";
import { useTabsStore } from "@/store/tabs";
import { useTerminalsStore } from "@/store/terminals";
import { useThemesStore } from "@/store/themes";
import type { PaneNode } from "@/types";

import "./StatusBar.css";

function truncateMiddle(value: string, max: number): string {
  if (!value) return "";
  if (value.length <= max) return value;
  if (max < 4) return value.slice(0, max);
  const keep = Math.floor((max - 1) / 2);
  return `${value.slice(0, keep)}…${value.slice(value.length - (max - keep - 1))}`;
}

function countLeafPanes(
  rootId: string | undefined,
  panes: Record<string, PaneNode>,
): number {
  if (!rootId) return 0;
  let count = 0;
  const stack: string[] = [rootId];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const node = panes[id];
    if (!node) continue;
    if (node.type === "leaf") {
      count += 1;
    } else {
      for (const c of node.children) stack.push(c);
    }
  }
  return count;
}

function dispatchAction(action: string, detail?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(`multiterminal:${action}`, { detail: detail ?? {} }),
  );
}

export function StatusBar(): JSX.Element {
  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const panes = useLayoutStore((s) => s.panes);
  const terminals = useTerminalsStore((s) => s.terminals);

  const fontSize = useSettingsStore((s) => s.settings.fontSize);
  const profiles = useSettingsStore((s) => s.settings.profiles);

  const activeThemeId = useThemesStore((s) => s.activeThemeId);
  const builtInThemes = useThemesStore((s) => s.builtInThemes);
  const customThemes = useThemesStore((s) => s.customThemes);

  const activeTheme = useMemo(
    () =>
      builtInThemes.find((t) => t.id === activeThemeId) ??
      customThemes.find((t) => t.id === activeThemeId) ??
      null,
    [builtInThemes, customThemes, activeThemeId],
  );

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? null,
    [tabs, activeTabId],
  );

  const activePane = useMemo(() => {
    if (!activeTab) return null;
    return panes[activeTab.activePaneId] ?? null;
  }, [activeTab, panes]);

  const activeTerminal = useMemo(() => {
    if (!activePane || activePane.type !== "leaf") return null;
    return terminals[activePane.terminalId] ?? null;
  }, [activePane, terminals]);

  const activeProfile = useMemo(() => {
    if (!activeTab) return null;
    return profiles.find((p) => p.id === activeTab.profileId) ?? null;
  }, [activeTab, profiles]);

  const paneCount = useMemo(
    () => countLeafPanes(activeTab?.rootPaneId, panes),
    [activeTab, panes],
  );

  const shellLabel = useMemo(() => {
    const shell = activeTerminal?.shell ?? activeProfile?.shell ?? "";
    return truncateMiddle(shell, 42);
  }, [activeTerminal, activeProfile]);

  const cwdLabel = useMemo(() => {
    const cwd = activeTerminal?.cwd ?? "";
    return truncateMiddle(cwd, 48);
  }, [activeTerminal]);

  const handleOpenThemeEditor = (): void => {
    dispatchAction("open-theme-editor");
  };

  const handleOpenAppearance = (): void => {
    dispatchAction("open-settings", { section: "appearance" });
  };

  const themeName = activeTheme?.name ?? "Default";

  return (
    <footer
      className="mt-statusbar"
      role="contentinfo"
      aria-label="Status bar"
    >
      <div className="mt-statusbar__side mt-statusbar__side--left">
        {activeProfile ? (
          <div
            className="mt-statusbar__seg"
            title={`Profile: ${activeProfile.name}${shellLabel ? ` — ${shellLabel}` : ""}`}
          >
            <Terminal className="mt-statusbar__icon" aria-hidden="true" />
            <span className="mt-statusbar__value">{activeProfile.name}</span>
            {shellLabel ? (
              <span className="mt-statusbar__value mt-statusbar__value--subtle">
                {shellLabel}
              </span>
            ) : null}
          </div>
        ) : null}

        {activeTerminal?.pid ? (
          <div
            className="mt-statusbar__seg"
            title={`Process ID: ${activeTerminal.pid}`}
          >
            <Cpu className="mt-statusbar__icon" aria-hidden="true" />
            <span className="mt-statusbar__value">
              pid {activeTerminal.pid}
            </span>
          </div>
        ) : null}

        {cwdLabel ? (
          <div
            className="mt-statusbar__seg"
            title={activeTerminal?.cwd ?? ""}
          >
            <Folder className="mt-statusbar__icon" aria-hidden="true" />
            <span className="mt-statusbar__value">{cwdLabel}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-statusbar__side mt-statusbar__side--right">
        <button
          type="button"
          className="mt-statusbar__seg mt-statusbar__seg--btn"
          onClick={handleOpenThemeEditor}
          title={`Theme: ${themeName} — click to open theme editor`}
          aria-label={`Active theme: ${themeName}. Click to open theme editor.`}
        >
          <Palette className="mt-statusbar__icon" aria-hidden="true" />
          <span className="mt-statusbar__value">{themeName}</span>
        </button>

        <button
          type="button"
          className="mt-statusbar__seg mt-statusbar__seg--btn"
          onClick={handleOpenAppearance}
          title={`Font size: ${fontSize}px — click to open appearance settings`}
          aria-label={`Font size: ${fontSize} pixels. Click to open appearance settings.`}
        >
          <Type className="mt-statusbar__icon" aria-hidden="true" />
          <span className="mt-statusbar__value">{fontSize}px</span>
        </button>

        <div
          className="mt-statusbar__seg"
          title={`${tabs.length} tab${tabs.length === 1 ? "" : "s"} · ${paneCount} pane${paneCount === 1 ? "" : "s"}`}
        >
          <Rows className="mt-statusbar__icon" aria-hidden="true" />
          <span className="mt-statusbar__value">
            {tabs.length} / {paneCount}
          </span>
        </div>

        <div
          className="mt-statusbar__seg mt-statusbar__seg--attribution"
          title="Multi-Terminal — by Enes Karademir"
          aria-label="Multi-Terminal by Enes Karademir"
        >
          <span className="mt-statusbar__value">Enes Karademir</span>
        </div>
      </div>
    </footer>
  );
}
