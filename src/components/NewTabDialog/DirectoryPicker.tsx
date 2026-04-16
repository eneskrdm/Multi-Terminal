import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Clock, Folder, FolderOpen, Home } from "lucide-react";
import clsx from "clsx";

import { fsExpandPath, fsListSubdirs } from "@/lib/tauri";

import { loadRecentDirs } from "./recentDirs";

interface DirectoryPickerProps {
  value: string;
  homeDir: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
}

function detectSeparator(path: string): "/" | "\\" {
  if (path.includes("\\") && !path.includes("/")) return "\\";
  if (path.includes("/") && !path.includes("\\")) return "/";
  return path.includes("\\") ? "\\" : "/";
}

function splitPath(value: string): { parent: string; partial: string } {
  if (!value) return { parent: "", partial: "" };
  const lastFwd = value.lastIndexOf("/");
  const lastBack = value.lastIndexOf("\\");
  const lastSep = Math.max(lastFwd, lastBack);
  if (lastSep < 0) return { parent: "", partial: value };
  return {
    parent: value.slice(0, lastSep + 1),
    partial: value.slice(lastSep + 1),
  };
}

function joinPath(parent: string, name: string): string {
  if (!parent) return name;
  const sep = detectSeparator(parent);
  if (parent.endsWith("/") || parent.endsWith("\\")) return `${parent}${name}`;
  return `${parent}${sep}${name}`;
}

export function DirectoryPicker({
  value,
  homeDir,
  onChange,
  onConfirm,
}: DirectoryPickerProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const { parent, partial } = useMemo(() => splitPath(value), [value]);

  const recentDirs = useMemo(() => loadRecentDirs(), [focused]);

  const fetchTokenRef = useRef(0);
  useEffect(() => {
    if (!focused) return;
    const token = ++fetchTokenRef.current;
    const lookup = parent || value || homeDir || "~";
    void fsListSubdirs({ path: lookup })
      .then((dirs) => {
        if (token !== fetchTokenRef.current) return;
        setSuggestions(dirs);
      })
      .catch(() => {
        if (token !== fetchTokenRef.current) return;
        setSuggestions([]);
      });
  }, [parent, value, focused, homeDir]);

  const filteredMatches = useMemo(() => {
    const lowered = partial.toLowerCase();
    const prefix = suggestions.filter((n) => n.toLowerCase().startsWith(lowered));
    const contains = suggestions.filter(
      (n) =>
        !n.toLowerCase().startsWith(lowered) &&
        n.toLowerCase().includes(lowered),
    );
    return [...prefix, ...contains].slice(0, 24);
  }, [suggestions, partial]);

  const showRecent =
    filteredMatches.length === 0 && recentDirs.length > 0;
  const displayed: {
    section: "recent" | "subdirs";
    items: string[];
    parentLabel: string;
  } = showRecent
    ? { section: "recent", items: recentDirs, parentLabel: "" }
    : {
        section: "subdirs",
        items: filteredMatches,
        parentLabel: parent || value || homeDir,
      };

  useEffect(() => {
    setHighlight(0);
  }, [displayed.items.length, displayed.section]);

  const commitSuggestion = useCallback(
    (name: string) => {
      if (displayed.section === "recent") {
        onChange(name);
      } else {
        onChange(joinPath(parent || homeDir, name));
      }
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [displayed.section, parent, homeDir, onChange],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        if (focused && displayed.items.length > 0 && displayed.section === "subdirs") {
          e.preventDefault();
          commitSuggestion(displayed.items[highlight] ?? displayed.items[0]);
          return;
        }
        e.preventDefault();
        onConfirm();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (displayed.items.length > 0) {
          setHighlight((h) => (h + 1) % displayed.items.length);
        }
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (displayed.items.length > 0) {
          setHighlight((h) =>
            (h - 1 + displayed.items.length) % displayed.items.length,
          );
        }
        return;
      }
      if (e.key === "Tab" && displayed.section === "subdirs" && displayed.items.length > 0) {
        e.preventDefault();
        commitSuggestion(displayed.items[highlight] ?? displayed.items[0]);
      }
    },
    [focused, displayed, highlight, commitSuggestion, onConfirm],
  );

  const handleHome = useCallback(() => {
    onChange(homeDir || "~");
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [onChange, homeDir]);

  const handleBrowse = useCallback(async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const initial = value && value.trim() ? await fsExpandPath({ path: value }) : homeDir;
      const result = await open({
        directory: true,
        multiple: false,
        defaultPath: initial || undefined,
      });
      if (typeof result === "string" && result.length > 0) {
        onChange(result);
      }
    } catch {
      // User cancelled or plugin unavailable — silent no-op.
    }
  }, [value, homeDir, onChange]);

  const handleBlur = useCallback(() => {
    setTimeout(() => setFocused(false), 120);
  }, []);

  return (
    <div className="mt-opentab__dirpicker">
      <label className="mt-opentab__label" htmlFor="mt-opentab-cwd">
        Directory
        <span className="mt-opentab__hint">
          Type to search, ↓↑ to navigate, Tab to complete, Enter to open.
        </span>
      </label>
      <div className="mt-opentab__dirpicker-row">
        <div className="mt-opentab__dirpicker-field">
          <Folder className="mt-opentab__dirpicker-icon" size={14} aria-hidden="true" />
          <input
            id="mt-opentab-cwd"
            ref={inputRef}
            type="text"
            className="mt-opentab__input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="~"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <button
          type="button"
          className="mt-opentab__icon-btn"
          onClick={handleHome}
          aria-label="Go to home directory"
          title="Home"
        >
          <Home size={14} />
        </button>
        <button
          type="button"
          className="mt-opentab__icon-btn"
          onClick={handleBrowse}
          aria-label="Browse for folder"
          title="Browse…"
        >
          <FolderOpen size={14} />
        </button>
      </div>

      {focused && displayed.items.length > 0 ? (
        <div
          ref={suggestionsRef}
          className="mt-opentab__suggestions"
          role="listbox"
          aria-label={
            displayed.section === "recent" ? "Recent directories" : "Subdirectories"
          }
        >
          <div className="mt-opentab__suggestions-section">
            {displayed.section === "recent" ? (
              <>
                <Clock size={12} aria-hidden="true" />
                <span>Recent</span>
              </>
            ) : (
              <>
                <Folder size={12} aria-hidden="true" />
                <span className="mt-opentab__suggestions-path">
                  {displayed.parentLabel}
                </span>
              </>
            )}
          </div>
          {displayed.items.map((name, idx) => (
            <button
              key={`${displayed.section}-${name}`}
              type="button"
              role="option"
              aria-selected={idx === highlight}
              className={clsx("mt-opentab__suggestion", {
                "is-highlight": idx === highlight,
              })}
              onMouseDown={(e) => {
                e.preventDefault();
                commitSuggestion(name);
              }}
              onMouseEnter={() => setHighlight(idx)}
            >
              {displayed.section === "recent" ? (
                <Clock size={12} aria-hidden="true" />
              ) : (
                <Folder size={12} aria-hidden="true" />
              )}
              <span className="mt-opentab__suggestion-label">{name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
