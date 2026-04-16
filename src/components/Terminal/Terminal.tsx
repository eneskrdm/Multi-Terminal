import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import clsx from "clsx";
import { X, ChevronUp, ChevronDown } from "lucide-react";

import { Terminal as XTerm, type ITerminalOptions } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { WebglAddon } from "@xterm/addon-webgl";
import { SearchAddon } from "@xterm/addon-search";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { SerializeAddon } from "@xterm/addon-serialize";
import type { UnlistenFn } from "@tauri-apps/api/event";

import {
  onTerminalData,
  onTerminalExit,
  onTerminalTitle,
  terminalResize,
  terminalWrite,
} from "@/lib/tauri";
import { emit, on } from "@/lib/events";
import { useTerminalsStore } from "@/store/terminals";
import { useSettingsStore } from "@/store/settings";
import { useThemesStore } from "@/store/themes";

import type {
  Settings,
  Theme,
  TerminalColors,
} from "@/types";

import "@xterm/xterm/css/xterm.css";
import "./Terminal.css";

interface TerminalProps {
  terminalId: string;
  isFocused: boolean;
  onFocus: () => void;
}

interface SearchState {
  open: boolean;
  query: string;
}

const RESIZE_THROTTLE_MS = 50;

function buildXtermTheme(terminal: TerminalColors): ITerminalOptions["theme"] {
  return {
    background: terminal.background,
    foreground: terminal.foreground,
    cursor: terminal.cursor,
    cursorAccent: terminal.cursorAccent,
    selectionBackground: terminal.selectionBackground,
    selectionForeground: terminal.selectionForeground,
    black: terminal.ansi.black,
    red: terminal.ansi.red,
    green: terminal.ansi.green,
    yellow: terminal.ansi.yellow,
    blue: terminal.ansi.blue,
    magenta: terminal.ansi.magenta,
    cyan: terminal.ansi.cyan,
    white: terminal.ansi.white,
    brightBlack: terminal.ansi.brightBlack,
    brightRed: terminal.ansi.brightRed,
    brightGreen: terminal.ansi.brightGreen,
    brightYellow: terminal.ansi.brightYellow,
    brightBlue: terminal.ansi.brightBlue,
    brightMagenta: terminal.ansi.brightMagenta,
    brightCyan: terminal.ansi.brightCyan,
    brightWhite: terminal.ansi.brightWhite,
  };
}

function buildXtermOptions(settings: Settings, theme: Theme): ITerminalOptions {
  return {
    fontFamily: settings.fontFamily,
    fontSize: settings.fontSize,
    fontWeight: settings.fontWeight,
    lineHeight: settings.lineHeight,
    letterSpacing: settings.letterSpacing,
    cursorStyle: settings.cursorStyle,
    cursorBlink: settings.cursorBlink,
    scrollback: settings.scrollback,
    wordSeparator: settings.wordSeparators,
    smoothScrollDuration: settings.smoothScrolling ? 120 : 0,
    allowProposedApi: true,
    allowTransparency: settings.opacity < 1,
    theme: buildXtermTheme(theme.terminal),
    rightClickSelectsWord: false,
    macOptionIsMeta: true,
  };
}

export function Terminal({ terminalId, isFocused, onFocus }: TerminalProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const searchRef = useRef<SearchAddon | null>(null);
  const webglRef = useRef<WebglAddon | null>(null);
  const serializeRef = useRef<SerializeAddon | null>(null);
  const initialFontSizeRef = useRef<number>(14);
  const lastSentResizeRef = useRef<{ cols: number; rows: number } | null>(null);
  const resizeTimerRef = useRef<number | null>(null);
  const pendingResizeRef = useRef<{ cols: number; rows: number } | null>(null);
  const mountedRef = useRef<boolean>(false);
  const isFocusedRef = useRef<boolean>(isFocused);
  const exitedRef = useRef<boolean>(false);

  const [searchState, setSearchState] = useState<SearchState>({ open: false, query: "" });
  const [exitInfo, setExitInfo] = useState<{ code: number | null } | null>(null);

  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  // ------------------------------------------------------------------
  // Initial mount: create xterm instance + addons.
  // ------------------------------------------------------------------
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const settings = useSettingsStore.getState().settings;
    const activeTheme = useThemesStore.getState().getActiveTheme();
    initialFontSizeRef.current = settings.fontSize;

    const term = new XTerm(buildXtermOptions(settings, activeTheme));

    const fit = new FitAddon();
    const webLinks = new WebLinksAddon();
    const search = new SearchAddon();
    const unicode = new Unicode11Addon();
    const serialize = new SerializeAddon();

    term.loadAddon(fit);
    term.loadAddon(webLinks);
    term.loadAddon(search);
    term.loadAddon(unicode);
    term.loadAddon(serialize);
    term.unicode.activeVersion = "11";

    term.open(container);

    // WebGL is optional — if the context can't be acquired (e.g., in a very
    // sandboxed environment or broken driver), `activate()` will throw.
    if (settings.webGLRendering !== false && settings.gpuAcceleration !== false) {
      try {
        const webgl = new WebglAddon();
        webgl.onContextLoss(() => {
          webgl.dispose();
          webglRef.current = null;
        });
        term.loadAddon(webgl);
        webglRef.current = webgl;
      } catch {
        webglRef.current = null;
      }
    }

    termRef.current = term;
    fitRef.current = fit;
    searchRef.current = search;
    serializeRef.current = serialize;
    mountedRef.current = true;

    // Initial fit after layout is available.
    const performInitialFit = (): void => {
      if (!mountedRef.current || !fitRef.current) return;
      try {
        fitRef.current.fit();
        const { cols, rows } = term;
        lastSentResizeRef.current = { cols, rows };
        void terminalResize({ id: terminalId, cols, rows }).catch(() => {
          // Backend may not know about this terminal yet in edge cases
          // (race during tab close). Safe to ignore — we'll retry on next resize.
        });
      } catch {
        // Retry on next frame if layout not stable yet.
      }
    };
    // Two-RAF pattern avoids zero-size container issues during StrictMode double-invoke.
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(performInitialFit);
      (container as HTMLDivElement & { _raf2?: number })._raf2 = raf2;
    });

    // User input → backend.
    const onDataDisp = term.onData((data) => {
      if (exitedRef.current) return;
      void terminalWrite({ id: terminalId, data }).catch(() => {});
    });

    // Binary input (pastes etc.).
    const onBinaryDisp = term.onBinary((data) => {
      if (exitedRef.current) return;
      void terminalWrite({ id: terminalId, data }).catch(() => {});
    });

    // Track focus → lift up to Pane.
    const handleContainerFocus = (): void => {
      onFocus();
    };
    const xtermTextarea = container.querySelector("textarea");
    if (xtermTextarea) {
      xtermTextarea.addEventListener("focus", handleContainerFocus);
    }
    container.addEventListener("pointerdown", handleContainerFocus);

    return () => {
      mountedRef.current = false;
      onDataDisp.dispose();
      onBinaryDisp.dispose();
      cancelAnimationFrame(raf1);
      const c = container as HTMLDivElement & { _raf2?: number };
      if (c._raf2 !== undefined) cancelAnimationFrame(c._raf2);
      if (resizeTimerRef.current !== null) {
        window.clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = null;
      }
      if (xtermTextarea) {
        xtermTextarea.removeEventListener("focus", handleContainerFocus);
      }
      container.removeEventListener("pointerdown", handleContainerFocus);
      try {
        webglRef.current?.dispose();
      } catch {
        /* ignore */
      }
      webglRef.current = null;
      searchRef.current = null;
      fitRef.current = null;
      serializeRef.current = null;
      try {
        term.dispose();
      } catch {
        /* ignore */
      }
      termRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminalId]);

  // ------------------------------------------------------------------
  // Resize observer → fit + throttled backend notify.
  // ------------------------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const flushPending = (): void => {
      const pending = pendingResizeRef.current;
      pendingResizeRef.current = null;
      resizeTimerRef.current = null;
      if (!pending) return;
      const last = lastSentResizeRef.current;
      if (last && last.cols === pending.cols && last.rows === pending.rows) return;
      lastSentResizeRef.current = pending;
      void terminalResize({ id: terminalId, cols: pending.cols, rows: pending.rows }).catch(() => {});
    };

    const scheduleBackendResize = (cols: number, rows: number): void => {
      pendingResizeRef.current = { cols, rows };
      if (resizeTimerRef.current !== null) return;
      resizeTimerRef.current = window.setTimeout(flushPending, RESIZE_THROTTLE_MS);
    };

    const observer = new ResizeObserver(() => {
      const term = termRef.current;
      const fit = fitRef.current;
      if (!term || !fit) return;
      if (container.clientWidth === 0 || container.clientHeight === 0) return;
      try {
        fit.fit();
      } catch {
        return;
      }
      scheduleBackendResize(term.cols, term.rows);
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
      if (resizeTimerRef.current !== null) {
        window.clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = null;
      }
    };
  }, [terminalId]);

  // ------------------------------------------------------------------
  // Backend → terminal data/title/exit subscriptions.
  // ------------------------------------------------------------------
  useEffect(() => {
    let unlistenData: UnlistenFn | null = null;
    let unlistenExit: UnlistenFn | null = null;
    let unlistenTitle: UnlistenFn | null = null;
    let cancelled = false;

    const setup = async (): Promise<void> => {
      unlistenData = await onTerminalData((payload) => {
        if (payload.terminalId !== terminalId) return;
        const term = termRef.current;
        if (!term) return;
        term.write(payload.data);
      });
      unlistenExit = await onTerminalExit((payload) => {
        if (payload.terminalId !== terminalId) return;
        exitedRef.current = true;
        setExitInfo({ code: payload.exitCode });
        useTerminalsStore.getState().updateTerminal(terminalId, {
          exited: true,
          exitCode: payload.exitCode,
        });
      });
      unlistenTitle = await onTerminalTitle((payload) => {
        if (payload.terminalId !== terminalId) return;
        useTerminalsStore.getState().updateTerminal(terminalId, {
          title: payload.title,
        });
      });
      if (cancelled) {
        unlistenData?.();
        unlistenExit?.();
        unlistenTitle?.();
      }
    };

    void setup();

    return () => {
      cancelled = true;
      unlistenData?.();
      unlistenExit?.();
      unlistenTitle?.();
    };
  }, [terminalId]);

  // ------------------------------------------------------------------
  // Respond to settings changes live.
  // ------------------------------------------------------------------
  useEffect(() => {
    const unsub = useSettingsStore.subscribe((state, prev) => {
      const term = termRef.current;
      if (!term) return;
      const s = state.settings;
      const p = prev.settings;
      if (!s || !p) return;

      let changed = false;
      const next: ITerminalOptions = {};
      if (s.fontFamily !== p.fontFamily) {
        next.fontFamily = s.fontFamily;
        changed = true;
      }
      if (s.fontSize !== p.fontSize) {
        next.fontSize = s.fontSize;
        initialFontSizeRef.current = s.fontSize;
        changed = true;
      }
      if (s.fontWeight !== p.fontWeight) {
        next.fontWeight = s.fontWeight;
        changed = true;
      }
      if (s.lineHeight !== p.lineHeight) {
        next.lineHeight = s.lineHeight;
        changed = true;
      }
      if (s.letterSpacing !== p.letterSpacing) {
        next.letterSpacing = s.letterSpacing;
        changed = true;
      }
      if (s.cursorStyle !== p.cursorStyle) {
        next.cursorStyle = s.cursorStyle;
        changed = true;
      }
      if (s.cursorBlink !== p.cursorBlink) {
        next.cursorBlink = s.cursorBlink;
        changed = true;
      }
      if (s.scrollback !== p.scrollback) {
        next.scrollback = s.scrollback;
        changed = true;
      }
      if (s.wordSeparators !== p.wordSeparators) {
        next.wordSeparator = s.wordSeparators;
        changed = true;
      }
      if (s.smoothScrolling !== p.smoothScrolling) {
        next.smoothScrollDuration = s.smoothScrolling ? 120 : 0;
        changed = true;
      }
      if (!changed) return;
      try {
        term.options = { ...term.options, ...next };
      } catch {
        /* ignore */
      }
      // Font changes invalidate cell metrics — refit to keep proper rows/cols.
      try {
        fitRef.current?.fit();
      } catch {
        /* ignore */
      }
    });
    return unsub;
  }, []);

  // ------------------------------------------------------------------
  // Respond to theme changes live.
  // ------------------------------------------------------------------
  useEffect(() => {
    const unsub = useThemesStore.subscribe((state, prev) => {
      const term = termRef.current;
      if (!term) return;
      const sameActiveId = state.activeThemeId === prev.activeThemeId;
      const sameCustoms = state.customThemes === prev.customThemes;
      if (sameActiveId && sameCustoms) return;
      const active = state.getActiveTheme();
      if (!active) return;
      try {
        term.options = { ...term.options, theme: buildXtermTheme(active.terminal) };
      } catch {
        /* ignore */
      }
    });
    return unsub;
  }, []);

  // ------------------------------------------------------------------
  // Copy-on-select: when enabled, push selection to clipboard on select.
  // ------------------------------------------------------------------
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    const disp = term.onSelectionChange(() => {
      const enabled = useSettingsStore.getState().settings.copyOnSelect;
      if (!enabled) return;
      const sel = term.getSelection();
      if (!sel) return;
      if (navigator.clipboard && window.isSecureContext) {
        void navigator.clipboard.writeText(sel).catch(() => {});
      }
    });
    return () => {
      disp.dispose();
    };
  }, []);

  // ------------------------------------------------------------------
  // Right-click behavior.
  // ------------------------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleContextMenu = (e: MouseEvent): void => {
      const term = termRef.current;
      if (!term) return;
      const behavior = useSettingsStore.getState().settings.rightClickBehavior;

      if (behavior === "paste") {
        e.preventDefault();
        pasteFromClipboard();
        return;
      }
      if (behavior === "selectWord") {
        e.preventDefault();
        try {
          // xterm doesn't expose "select word at coordinate" publicly; approximate
          // with native double-click word selection at the pointer location.
          const el = (e.target as HTMLElement) || container;
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(el);
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
          // Fallback: copy current selection if any, else leave it.
          const current = term.getSelection();
          if (current) {
            void navigator.clipboard?.writeText(current).catch(() => {});
          }
        } catch {
          /* ignore */
        }
        return;
      }
      // "menu" → let ContextMenu component handle it via a CustomEvent so the
      // browser's native context menu doesn't show. We dispatch on window so
      // subscribers don't need a direct ref.
      e.preventDefault();
      const detail = {
        x: e.clientX,
        y: e.clientY,
        source: "terminal",
        terminalId,
      };
      window.dispatchEvent(new CustomEvent("mt:context-menu", { detail }));
    };

    container.addEventListener("contextmenu", handleContextMenu);
    return () => {
      container.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [terminalId]);

  // ------------------------------------------------------------------
  // Event bus listeners — only act when focused.
  // ------------------------------------------------------------------
  const pasteFromClipboard = useCallback((): void => {
    const term = termRef.current;
    if (!term) return;
    if (exitedRef.current) return;
    if (!navigator.clipboard) return;
    void navigator.clipboard
      .readText()
      .then((text) => {
        if (!text) return;
        void terminalWrite({ id: terminalId, data: text }).catch(() => {});
      })
      .catch(() => {});
  }, [terminalId]);

  const applyFontSize = useCallback((nextSize: number): void => {
    const term = termRef.current;
    if (!term) return;
    const clamped = Math.max(6, Math.min(72, Math.round(nextSize)));
    try {
      term.options = { ...term.options, fontSize: clamped };
      fitRef.current?.fit();
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const unsubscribers: Array<() => void> = [];

    unsubscribers.push(
      on("focus-active-terminal", () => {
        if (!isFocusedRef.current) return;
        termRef.current?.focus();
      }),
    );
    unsubscribers.push(
      on("terminal-clear", () => {
        if (!isFocusedRef.current) return;
        termRef.current?.clear();
      }),
    );
    unsubscribers.push(
      on("terminal-copy", () => {
        if (!isFocusedRef.current) return;
        const term = termRef.current;
        if (!term) return;
        const sel = term.getSelection();
        if (!sel) return;
        if (navigator.clipboard && window.isSecureContext) {
          void navigator.clipboard.writeText(sel).catch(() => {
            try {
              document.execCommand("copy");
            } catch {
              /* ignore */
            }
          });
        } else {
          try {
            document.execCommand("copy");
          } catch {
            /* ignore */
          }
        }
      }),
    );
    unsubscribers.push(
      on("terminal-paste", () => {
        if (!isFocusedRef.current) return;
        pasteFromClipboard();
      }),
    );
    unsubscribers.push(
      on("terminal-select-all", () => {
        if (!isFocusedRef.current) return;
        termRef.current?.selectAll();
      }),
    );
    unsubscribers.push(
      on("terminal-search", () => {
        if (!isFocusedRef.current) return;
        setSearchState((prev) => ({ ...prev, open: !prev.open }));
      }),
    );
    unsubscribers.push(
      on("terminal-zoom", (e) => {
        if (!isFocusedRef.current) return;
        const term = termRef.current;
        if (!term) return;
        const current = (term.options.fontSize as number | undefined) ?? initialFontSizeRef.current;
        applyFontSize(current + e.delta);
      }),
    );
    unsubscribers.push(
      on("terminal-zoom-reset", () => {
        if (!isFocusedRef.current) return;
        applyFontSize(useSettingsStore.getState().settings.fontSize);
      }),
    );

    return () => {
      for (const u of unsubscribers) u();
    };
  }, [applyFontSize, pasteFromClipboard]);

  // ------------------------------------------------------------------
  // When isFocused flips true, focus the xterm (unless exited).
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!isFocused) return;
    const term = termRef.current;
    if (!term) return;
    if (exitedRef.current) return;
    // Defer to next microtask so focus call happens after layout/DOM is stable.
    const raf = requestAnimationFrame(() => {
      try {
        term.focus();
      } catch {
        /* ignore */
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [isFocused]);

  // ------------------------------------------------------------------
  // Exited overlay: pressing Enter emits pane-close.
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!exitInfo) return;
    const handler = (e: KeyboardEvent): void => {
      if (!isFocusedRef.current) return;
      if (e.key === "Enter") {
        e.preventDefault();
        emit({ type: "pane-close" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [exitInfo]);

  // ------------------------------------------------------------------
  // Search helpers.
  // ------------------------------------------------------------------
  const runSearch = useCallback((direction: "next" | "prev") => {
    const addon = searchRef.current;
    if (!addon) return;
    const query = searchState.query;
    if (!query) return;
    const opts = {
      caseSensitive: false,
      wholeWord: false,
      regex: false,
      decorations: {
        matchBackground: "#c4a000",
        matchOverviewRuler: "#c4a000",
        activeMatchBackground: "#d08700",
        activeMatchColorOverviewRuler: "#d08700",
      },
    };
    if (direction === "next") {
      addon.findNext(query, opts);
    } else {
      addon.findPrevious(query, opts);
    }
  }, [searchState.query]);

  const closeSearch = useCallback(() => {
    setSearchState({ open: false, query: "" });
    const addon = searchRef.current;
    addon?.clearDecorations();
    const term = termRef.current;
    term?.focus();
  }, []);

  const handleSearchKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeSearch();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        runSearch(e.shiftKey ? "prev" : "next");
      }
    },
    [closeSearch, runSearch],
  );

  const focusRing = useMemo(
    () => clsx("mt-terminal", { "mt-terminal--focused": isFocused }),
    [isFocused],
  );

  return (
    <div className={focusRing} ref={rootRef}>
      <div
        className="mt-terminal__viewport"
        ref={containerRef}
        data-terminal-id={terminalId}
      />

      {searchState.open && (
        <div className="mt-terminal__search" role="search">
          <input
            className="mt-terminal__search-input"
            type="text"
            placeholder="Find in terminal..."
            autoFocus
            value={searchState.query}
            onChange={(e) => setSearchState((s) => ({ ...s, query: e.target.value }))}
            onKeyDown={handleSearchKey}
            aria-label="Search terminal output"
          />
          <button
            type="button"
            className="mt-terminal__search-button"
            onClick={() => runSearch("prev")}
            aria-label="Previous match"
            title="Previous match (Shift+Enter)"
          >
            <ChevronUp size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="mt-terminal__search-button"
            onClick={() => runSearch("next")}
            aria-label="Next match"
            title="Next match (Enter)"
          >
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="mt-terminal__search-button"
            onClick={closeSearch}
            aria-label="Close search"
            title="Close (Esc)"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {exitInfo && (
        <div className="mt-terminal__overlay mt-terminal__overlay--error" role="status">
          <div className="mt-terminal__overlay-card">
            <p className="mt-terminal__overlay-title">
              Process exited
              {exitInfo.code !== null ? ` (code ${exitInfo.code})` : ""}
            </p>
            <p className="mt-terminal__overlay-hint">Press Enter to close the pane.</p>
          </div>
        </div>
      )}
    </div>
  );
}
