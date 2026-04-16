import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Palette, Plus, Trash2, X } from "lucide-react";
import clsx from "clsx";
import type { AnsiPalette, Theme, UIColors } from "@/types";
import { useThemesStore, applyThemeToDom } from "@/store/themes";
import { ColorField } from "./ColorField";
import { ThemePreview } from "./ThemePreview";
import "./ThemeEditor.css";

export interface ThemeEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Section {
  title: string;
  fields: {
    label: string;
    get: (theme: Theme) => string;
    apply: (theme: Theme, value: string) => Theme;
  }[];
}

function setTerminal(theme: Theme, patch: Partial<Theme["terminal"]>): Theme {
  return { ...theme, terminal: { ...theme.terminal, ...patch } };
}

function setAnsi(theme: Theme, key: keyof AnsiPalette, value: string): Theme {
  return {
    ...theme,
    terminal: {
      ...theme.terminal,
      ansi: { ...theme.terminal.ansi, [key]: value },
    },
  };
}

function setUI(theme: Theme, key: keyof UIColors, value: string): Theme {
  return { ...theme, ui: { ...theme.ui, [key]: value } };
}

const TERMINAL_SECTION: Section = {
  title: "Terminal — base",
  fields: [
    {
      label: "Background",
      get: (t) => t.terminal.background,
      apply: (t, v) => setTerminal(t, { background: v }),
    },
    {
      label: "Foreground",
      get: (t) => t.terminal.foreground,
      apply: (t, v) => setTerminal(t, { foreground: v }),
    },
    {
      label: "Cursor",
      get: (t) => t.terminal.cursor,
      apply: (t, v) => setTerminal(t, { cursor: v }),
    },
    {
      label: "Cursor accent",
      get: (t) => t.terminal.cursorAccent,
      apply: (t, v) => setTerminal(t, { cursorAccent: v }),
    },
    {
      label: "Selection",
      get: (t) => t.terminal.selectionBackground,
      apply: (t, v) => setTerminal(t, { selectionBackground: v }),
    },
  ],
};

const ANSI_KEYS: { key: keyof AnsiPalette; label: string }[] = [
  { key: "black", label: "Black" },
  { key: "red", label: "Red" },
  { key: "green", label: "Green" },
  { key: "yellow", label: "Yellow" },
  { key: "blue", label: "Blue" },
  { key: "magenta", label: "Magenta" },
  { key: "cyan", label: "Cyan" },
  { key: "white", label: "White" },
  { key: "brightBlack", label: "Bright black" },
  { key: "brightRed", label: "Bright red" },
  { key: "brightGreen", label: "Bright green" },
  { key: "brightYellow", label: "Bright yellow" },
  { key: "brightBlue", label: "Bright blue" },
  { key: "brightMagenta", label: "Bright magenta" },
  { key: "brightCyan", label: "Bright cyan" },
  { key: "brightWhite", label: "Bright white" },
];

const ANSI_SECTION: Section = {
  title: "Terminal — ANSI palette",
  fields: ANSI_KEYS.map(({ key, label }) => ({
    label,
    get: (t) => t.terminal.ansi[key],
    apply: (t, v) => setAnsi(t, key, v),
  })),
};

function uiField(
  label: string,
  key: keyof UIColors,
): Section["fields"][number] {
  return {
    label,
    get: (t) => t.ui[key],
    apply: (t, v) => setUI(t, key, v),
  };
}

const UI_BG_SECTION: Section = {
  title: "UI — backgrounds",
  fields: [
    uiField("Base", "bgBase"),
    uiField("Surface", "bgSurface"),
    uiField("Elevated", "bgElevated"),
    uiField("Overlay", "bgOverlay"),
    uiField("Hover", "bgHover"),
    uiField("Active", "bgActive"),
  ],
};

const UI_BORDER_SECTION: Section = {
  title: "UI — borders",
  fields: [
    uiField("Subtle", "borderSubtle"),
    uiField("Default", "borderDefault"),
    uiField("Strong", "borderStrong"),
  ],
};

const UI_TEXT_SECTION: Section = {
  title: "UI — text",
  fields: [
    uiField("Primary", "textPrimary"),
    uiField("Secondary", "textSecondary"),
    uiField("Muted", "textMuted"),
    uiField("Inverted", "textInverted"),
  ],
};

const UI_SEMANTIC_SECTION: Section = {
  title: "UI — semantic",
  fields: [
    uiField("Accent", "accent"),
    uiField("Accent hover", "accentHover"),
    uiField("Accent muted", "accentMuted"),
    uiField("Accent contrast", "accentContrast"),
    uiField("Success", "success"),
    uiField("Warning", "warning"),
    uiField("Danger", "danger"),
    uiField("Info", "info"),
  ],
};

const UI_CHROME_SECTION: Section = {
  title: "UI — titlebar & tabs",
  fields: [
    uiField("Titlebar BG", "titlebarBg"),
    uiField("Titlebar FG", "titlebarFg"),
    uiField("Tab active BG", "tabActiveBg"),
    uiField("Tab inactive BG", "tabInactiveBg"),
    uiField("Tab hover BG", "tabHoverBg"),
    uiField("Tab border", "tabBorder"),
  ],
};

const SECTIONS: Section[] = [
  TERMINAL_SECTION,
  ANSI_SECTION,
  UI_BG_SECTION,
  UI_BORDER_SECTION,
  UI_TEXT_SECTION,
  UI_SEMANTIC_SECTION,
  UI_CHROME_SECTION,
];

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={clsx("mt-theme-editor__section", { "is-open": open })}>
      <button
        type="button"
        className="mt-theme-editor__section-header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="mt-theme-editor__section-caret">
          {open ? "▾" : "▸"}
        </span>
        <span>{title}</span>
      </button>
      {open && <div className="mt-theme-editor__section-body">{children}</div>}
    </section>
  );
}

export function ThemeEditor({ isOpen, onClose }: ThemeEditorProps) {
  const builtIns = useThemesStore((s) => s.builtInThemes);
  const customs = useThemesStore((s) => s.customThemes);
  const activeThemeId = useThemesStore((s) => s.activeThemeId);
  const setActiveTheme = useThemesStore((s) => s.setActiveTheme);
  const addCustomTheme = useThemesStore((s) => s.addCustomTheme);
  const updateCustomTheme = useThemesStore((s) => s.updateCustomTheme);
  const deleteCustomTheme = useThemesStore((s) => s.deleteCustomTheme);
  const getActiveTheme = useThemesStore((s) => s.getActiveTheme);

  const [selectedId, setSelectedId] = useState<string>(activeThemeId);
  const [draft, setDraft] = useState<Theme | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const appliedPreviewRef = useRef(false);
  const originalActiveIdRef = useRef(activeThemeId);

  const allThemes = useMemo(() => [...builtIns, ...customs], [builtIns, customs]);

  const selectedTheme = useMemo(
    () => allThemes.find((t) => t.id === selectedId) ?? allThemes[0],
    [allThemes, selectedId],
  );

  const isCustom = useMemo(
    () => customs.some((t) => t.id === selectedId),
    [customs, selectedId],
  );

  // Reset when opening the modal.
  useEffect(() => {
    if (isOpen) {
      originalActiveIdRef.current = activeThemeId;
      appliedPreviewRef.current = false;
      setSelectedId(activeThemeId);
      setDraft(null);
      setPreviewMode(false);
    }
  }, [isOpen, activeThemeId]);

  // Revert preview when closing without saving.
  useEffect(() => {
    if (!isOpen && appliedPreviewRef.current) {
      const original = useThemesStore.getState().getThemeById(
        originalActiveIdRef.current,
      );
      if (original) applyThemeToDom(original);
      appliedPreviewRef.current = false;
    }
  }, [isOpen]);

  // When draft changes + preview mode is on, apply the draft to DOM live.
  useEffect(() => {
    if (!isOpen) return;
    if (!previewMode) return;
    if (!draft) return;
    applyThemeToDom(draft);
    appliedPreviewRef.current = true;
  }, [draft, previewMode, isOpen]);

  // Escape key closes.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const workingTheme: Theme = draft ?? selectedTheme;

  const handleSelect = useCallback(
    (id: string) => {
      if (draft && isCustom && draft.id === selectedId) {
        // auto-save pending edits on custom when switching
        updateCustomTheme(selectedId, draft);
      }
      setSelectedId(id);
      setDraft(null);
      if (previewMode) {
        const t = useThemesStore.getState().getThemeById(id);
        if (t) applyThemeToDom(t);
      }
    },
    [draft, isCustom, selectedId, updateCustomTheme, previewMode],
  );

  const handleFieldChange = (apply: (t: Theme, v: string) => Theme, value: string) => {
    const next = apply(workingTheme, value);
    if (isCustom) {
      setDraft(next);
    } else {
      // prompt duplicate
      const confirmed = window.confirm(
        "Built-in themes cannot be edited directly. Duplicate as a custom theme?",
      );
      if (!confirmed) return;
      const copy: Theme = {
        ...next,
        terminal: {
          ...next.terminal,
          ansi: { ...next.terminal.ansi },
        },
        ui: { ...next.ui },
        id: nanoid(),
        name: `${selectedTheme.name} (Custom)`,
        author: undefined,
      };
      addCustomTheme(copy);
      setSelectedId(copy.id);
      setDraft(null);
    }
  };

  const handleNewCustom = () => {
    const base = getActiveTheme();
    const copy: Theme = {
      ...base,
      terminal: {
        ...base.terminal,
        ansi: { ...base.terminal.ansi },
      },
      ui: { ...base.ui },
      id: nanoid(),
      name: `${base.name} (Custom)`,
      author: undefined,
    };
    addCustomTheme(copy);
    setSelectedId(copy.id);
    setDraft(null);
  };

  const handleDuplicate = () => {
    const copy: Theme = {
      ...workingTheme,
      terminal: {
        ...workingTheme.terminal,
        ansi: { ...workingTheme.terminal.ansi },
      },
      ui: { ...workingTheme.ui },
      id: nanoid(),
      name: `${workingTheme.name} (Custom)`,
      author: undefined,
    };
    addCustomTheme(copy);
    setSelectedId(copy.id);
    setDraft(null);
  };

  const handleDelete = () => {
    if (!isCustom) return;
    const confirmed = window.confirm(
      `Delete custom theme "${selectedTheme.name}"? This cannot be undone.`,
    );
    if (!confirmed) return;
    deleteCustomTheme(selectedId);
    setSelectedId(activeThemeId);
    setDraft(null);
  };

  const handleSave = () => {
    if (!isCustom || !draft) return;
    updateCustomTheme(selectedId, draft);
    setDraft(null);
  };

  const handleApply = () => {
    if (isCustom && draft) updateCustomTheme(selectedId, draft);
    setActiveTheme(selectedId);
    originalActiveIdRef.current = selectedId;
    appliedPreviewRef.current = false;
    onClose();
  };

  const handleTogglePreview = () => {
    const next = !previewMode;
    setPreviewMode(next);
    if (next) {
      applyThemeToDom(workingTheme);
      appliedPreviewRef.current = true;
    } else {
      const original = useThemesStore.getState().getThemeById(
        originalActiveIdRef.current,
      );
      if (original) applyThemeToDom(original);
      appliedPreviewRef.current = false;
    }
  };

  const handleRename = (name: string) => {
    if (!isCustom) return;
    const next = { ...workingTheme, name };
    setDraft(next);
  };

  const handleClose = () => {
    if (draft && isCustom) {
      const confirmed = window.confirm(
        "Discard unsaved changes to this custom theme?",
      );
      if (!confirmed) return;
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="theme-editor-root"
          className="mt-theme-editor__backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <motion.div
            className="mt-theme-editor"
            role="dialog"
            aria-modal="true"
            aria-label="Theme editor"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 4 }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <header className="mt-theme-editor__header">
              <div className="mt-theme-editor__title">
                <Palette size={16} />
                <span>Theme editor</span>
              </div>
              <button
                type="button"
                className="mt-theme-editor__close"
                onClick={handleClose}
                aria-label="Close theme editor"
              >
                <X size={16} />
              </button>
            </header>

            <div className="mt-theme-editor__body">
              <aside className="mt-theme-editor__sidebar">
                <div className="mt-theme-editor__sidebar-section">
                  <div className="mt-theme-editor__sidebar-title">Built-in</div>
                  <ul className="mt-theme-editor__theme-list">
                    {builtIns.map((t) => (
                      <li key={t.id}>
                        <button
                          type="button"
                          className={clsx("mt-theme-editor__theme-item", {
                            "is-active": t.id === selectedId,
                            "is-running": t.id === activeThemeId,
                          })}
                          onClick={() => handleSelect(t.id)}
                        >
                          <span
                            className="mt-theme-editor__theme-swatch"
                            style={{
                              background: `linear-gradient(135deg, ${t.terminal.background} 0%, ${t.ui.accent} 100%)`,
                              borderColor: t.ui.borderStrong,
                            }}
                          />
                          <span className="mt-theme-editor__theme-name">
                            {t.name}
                          </span>
                          {t.id === activeThemeId && (
                            <span className="mt-theme-editor__theme-badge">
                              active
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-theme-editor__sidebar-section">
                  <div className="mt-theme-editor__sidebar-title">
                    <span>Custom</span>
                    <button
                      type="button"
                      className="mt-theme-editor__new"
                      onClick={handleNewCustom}
                      title="New custom theme"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  {customs.length === 0 ? (
                    <div className="mt-theme-editor__empty">
                      No custom themes yet.
                    </div>
                  ) : (
                    <ul className="mt-theme-editor__theme-list">
                      {customs.map((t) => (
                        <li key={t.id}>
                          <button
                            type="button"
                            className={clsx("mt-theme-editor__theme-item", {
                              "is-active": t.id === selectedId,
                              "is-running": t.id === activeThemeId,
                            })}
                            onClick={() => handleSelect(t.id)}
                          >
                            <span
                              className="mt-theme-editor__theme-swatch"
                              style={{
                                background: `linear-gradient(135deg, ${t.terminal.background} 0%, ${t.ui.accent} 100%)`,
                                borderColor: t.ui.borderStrong,
                              }}
                            />
                            <span className="mt-theme-editor__theme-name">
                              {t.name}
                            </span>
                            {t.id === activeThemeId && (
                              <span className="mt-theme-editor__theme-badge">
                                active
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </aside>

              <main className="mt-theme-editor__main">
                <div className="mt-theme-editor__toolbar">
                  <div className="mt-theme-editor__name-row">
                    {isCustom ? (
                      <input
                        className="mt-theme-editor__name-input"
                        type="text"
                        value={workingTheme.name}
                        onChange={(e) => handleRename(e.target.value)}
                        placeholder="Theme name"
                        spellCheck={false}
                      />
                    ) : (
                      <div className="mt-theme-editor__name-static">
                        {workingTheme.name}
                        <span className="mt-theme-editor__name-tag">
                          built-in
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-theme-editor__toolbar-actions">
                    <button
                      type="button"
                      className="mt-theme-editor__btn"
                      onClick={handleDuplicate}
                      title="Duplicate as custom theme"
                    >
                      <Copy size={14} />
                      <span>Duplicate</span>
                    </button>
                    {isCustom && (
                      <button
                        type="button"
                        className="mt-theme-editor__btn mt-theme-editor__btn--danger"
                        onClick={handleDelete}
                        title="Delete custom theme"
                      >
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-theme-editor__content">
                  <div className="mt-theme-editor__fields">
                    {SECTIONS.map((section) => (
                      <CollapsibleSection
                        key={section.title}
                        title={section.title}
                        defaultOpen={section !== ANSI_SECTION}
                      >
                        <div className="mt-theme-editor__grid">
                          {section.fields.map((f) => (
                            <ColorField
                              key={f.label}
                              label={f.label}
                              value={f.get(workingTheme)}
                              onChange={(v) => handleFieldChange(f.apply, v)}
                            />
                          ))}
                        </div>
                      </CollapsibleSection>
                    ))}
                  </div>

                  <div className="mt-theme-editor__preview">
                    <ThemePreview theme={workingTheme} />
                  </div>
                </div>
              </main>
            </div>

            <footer className="mt-theme-editor__footer">
              <label className="mt-theme-editor__preview-toggle">
                <input
                  type="checkbox"
                  checked={previewMode}
                  onChange={handleTogglePreview}
                />
                <span>Live preview</span>
              </label>
              <div className="mt-theme-editor__footer-actions">
                {isCustom && draft && (
                  <button
                    type="button"
                    className="mt-theme-editor__btn"
                    onClick={handleSave}
                  >
                    Save changes
                  </button>
                )}
                <button
                  type="button"
                  className="mt-theme-editor__btn"
                  onClick={handleClose}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="mt-theme-editor__btn mt-theme-editor__btn--primary"
                  onClick={handleApply}
                >
                  Apply
                </button>
              </div>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
