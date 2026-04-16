import {
  useEffect,
  useMemo,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Terminal } from "lucide-react";
import clsx from "clsx";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { windowIsMaximized, windowToggleMaximize } from "@/lib/tauri";
import { useTabsStore } from "@/store/tabs";

import { WindowControls } from "./WindowControls";
import "./TitleBar.css";

export function TitleBar(): JSX.Element {
  const [isMaximized, setIsMaximized] = useState(false);

  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);

  const activeTitle = useMemo(() => {
    if (!activeTabId) return null;
    return tabs.find((t) => t.id === activeTabId)?.title ?? null;
  }, [tabs, activeTabId]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const maxed = await windowIsMaximized();
        if (!cancelled) setIsMaximized(maxed);
      } catch {
        // Tauri command may be unavailable when running in a browser context.
      }

      try {
        const win = getCurrentWindow();
        const off = await win.onResized(async () => {
          try {
            const nowMax = await win.isMaximized();
            setIsMaximized(nowMax);
          } catch {
            // Ignore sporadic IPC errors mid-resize.
          }
        });
        if (cancelled) {
          off();
        } else {
          unlisten = off;
        }
      } catch {
        // Non-Tauri context; skip.
      }
    })();

    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
  }, []);

  const handleDoubleClick = (event: ReactMouseEvent<HTMLDivElement>): void => {
    // Only toggle when the double-click is on the drag region itself, not on
    // the window controls or other interactive children.
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target.closest(".mt-wincontrols")) return;
    void windowToggleMaximize();
  };

  return (
    <div
      className={clsx("mt-titlebar", {
        "mt-titlebar--maximized": isMaximized,
      })}
      data-tauri-drag-region
      onDoubleClick={handleDoubleClick}
      role="toolbar"
      aria-label="Application title bar"
    >
      <div className="mt-titlebar__left" data-tauri-drag-region>
        <div className="mt-titlebar__logo" aria-hidden="true">
          <Terminal size={14} strokeWidth={2.25} />
        </div>
        <span className="mt-titlebar__product" data-tauri-drag-region>
          MultiTerminal
        </span>
      </div>

      <div className="mt-titlebar__center" data-tauri-drag-region>
        {activeTitle ? (
          <span className="mt-titlebar__crumb" data-tauri-drag-region>
            {activeTitle}
          </span>
        ) : null}
      </div>

      <div className="mt-titlebar__right">
        <WindowControls isMaximized={isMaximized} />
      </div>
    </div>
  );
}
