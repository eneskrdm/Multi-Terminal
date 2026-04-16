import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import clsx from "clsx";
import { useSettingsStore } from "@/store/settings";
import { commandRegistry } from "@/lib/commands";
import type { CommandDescriptor, CommandId } from "@/types";

export function Keybindings() {
  const settings = useSettingsStore((s) => s.settings);
  const setKeybinding = useSettingsStore((s) => s.setKeybinding);

  const [query, setQuery] = useState("");
  const [capturing, setCapturing] = useState<CommandId | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commandRegistry;
    return commandRegistry.filter(
      (c: CommandDescriptor) =>
        c.label.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="settings-section">
      <h2 className="settings-section__title">Keybindings</h2>

      <div className="settings-kb-search">
        <input
          type="search"
          className="settings-input"
          placeholder="Filter commands…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="settings-kb-table">
        {filtered.length === 0 ? (
          <div className="settings-empty">No commands match your filter.</div>
        ) : (
          filtered.map((cmd) => {
            const accelerator =
              settings.keybindings[cmd.id] !== undefined
                ? settings.keybindings[cmd.id]
                : (cmd.defaultKey ?? null);
            return (
              <div className="settings-kb-row" key={cmd.id}>
                <div className="settings-kb-row__label">
                  <span className="settings-kb-row__name">{cmd.label}</span>
                  <span className="settings-kb-row__category">
                    {cmd.category}
                  </span>
                </div>
                <button
                  type="button"
                  className={clsx(
                    "settings-kb-row__combo",
                    !accelerator && "settings-kb-row__combo--empty",
                  )}
                  onClick={() => setCapturing(cmd.id)}
                >
                  {accelerator ? (
                    renderAccelerator(accelerator)
                  ) : (
                    <span>Not bound</span>
                  )}
                </button>
                <button
                  type="button"
                  className="settings-btn settings-btn--ghost settings-btn--small"
                  title="Reset to default"
                  onClick={() => setKeybinding(cmd.id, cmd.defaultKey ?? null)}
                >
                  <X size={12} /> Reset
                </button>
              </div>
            );
          })
        )}
      </div>

      {capturing && (
        <CaptureOverlay
          commandId={capturing}
          onCancel={() => setCapturing(null)}
          onConfirm={(accelerator) => {
            setKeybinding(capturing, accelerator);
            setCapturing(null);
          }}
          onClear={() => {
            setKeybinding(capturing, null);
            setCapturing(null);
          }}
        />
      )}
    </div>
  );
}

function renderAccelerator(accelerator: string) {
  const parts = accelerator.split("+").map((p) => p.trim()).filter(Boolean);
  return (
    <>
      {parts.map((part, idx) => (
        <span key={idx} style={{ display: "inline-flex", gap: 4 }}>
          {idx > 0 && (
            <span
              style={{
                color: "var(--mt-text-muted, #565f89)",
                fontSize: 10,
                padding: "0 2px",
              }}
            >
              +
            </span>
          )}
          <kbd className="settings-kbd">{part}</kbd>
        </span>
      ))}
    </>
  );
}

interface CaptureOverlayProps {
  commandId: CommandId;
  onCancel: () => void;
  onConfirm: (accelerator: string) => void;
  onClear: () => void;
}

function CaptureOverlay({
  onCancel,
  onConfirm,
  onClear,
}: CaptureOverlayProps) {
  const [captured, setCaptured] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key === "Enter" && captured) {
        e.preventDefault();
        onConfirm(captured);
        return;
      }

      // Capture non-modifier key with active modifiers.
      const isModifierOnly =
        e.key === "Control" ||
        e.key === "Shift" ||
        e.key === "Alt" ||
        e.key === "Meta";
      if (isModifierOnly) return;

      e.preventDefault();
      e.stopPropagation();

      const parts: string[] = [];
      if (e.ctrlKey) parts.push("Ctrl");
      if (e.shiftKey) parts.push("Shift");
      if (e.altKey) parts.push("Alt");
      if (e.metaKey) parts.push("Meta");

      const key = normalizeKey(e.key);
      parts.push(key);

      setCaptured(parts.join("+"));
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [captured, onCancel, onConfirm]);

  return (
    <div className="settings-capture-overlay" onClick={onCancel}>
      <div className="settings-capture" onClick={(e) => e.stopPropagation()}>
        <p className="settings-capture__hint">
          {captured
            ? "Press Enter to confirm, Escape to cancel."
            : "Press the key combination…"}
        </p>
        <div className="settings-capture__combo">
          {captured ? (
            renderAccelerator(captured)
          ) : (
            <span style={{ color: "var(--mt-text-muted, #565f89)" }}>
              Listening…
            </span>
          )}
        </div>
        <div className="settings-capture__actions">
          <button
            type="button"
            className="settings-btn settings-btn--ghost"
            onClick={onClear}
          >
            Clear binding
          </button>
          <button
            type="button"
            className="settings-btn"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="settings-btn settings-btn--primary"
            disabled={!captured}
            onClick={() => captured && onConfirm(captured)}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function normalizeKey(key: string): string {
  if (key === " ") return "Space";
  if (key.length === 1) return key.toUpperCase();
  return key;
}
