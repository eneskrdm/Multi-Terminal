import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Terminal as TerminalIcon, X } from "lucide-react";
import clsx from "clsx";

import type { Profile } from "@/types";
import { useSettingsStore } from "@/store/settings";
import { useTabsStore, type PaneLayout } from "@/store/tabs";
import { useUIStore } from "@/lib/commands";
import { fsExpandPath, fsHomeDir, fsPathIsDir } from "@/lib/tauri";

import { DirectoryPicker } from "./DirectoryPicker";
import { LayoutPicker } from "./LayoutPicker";
import { addRecentDir } from "./recentDirs";

import "./NewTabDialog.css";

export function NewTabDialog(): JSX.Element {
  const open = useUIStore((s) => s.newTabDialogOpen);
  const setOpen = useUIStore((s) => s.setNewTabDialog);

  const profiles = useSettingsStore((s) => s.settings.profiles);
  const defaultProfileId = useSettingsStore((s) => s.settings.defaultProfileId);
  const createTabWithLayout = useTabsStore((s) => s.createTabWithLayout);

  const [profileId, setProfileId] = useState<string>("");
  const [cwd, setCwd] = useState<string>("");
  const [layout, setLayout] = useState<PaneLayout>("single");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const homeDirRef = useRef<string>("");

  const activeProfile = useMemo<Profile | undefined>(
    () => profiles.find((p) => p.id === profileId) ?? profiles[0],
    [profiles, profileId],
  );

  useEffect(() => {
    if (!open) return;
    const initial =
      profiles.find((p) => p.id === defaultProfileId)?.id ??
      profiles.find((p) => p.isDefault)?.id ??
      profiles[0]?.id ??
      "";
    setProfileId(initial);
    setLayout("single");
    setSubmitting(false);
    setError(null);

    void (async () => {
      try {
        const home = homeDirRef.current || (await fsHomeDir());
        homeDirRef.current = home;
        setCwd(home);
      } catch {
        setCwd("~");
      }
    })();
  }, [open, profiles, defaultProfileId]);

  const handleClose = useCallback(() => {
    if (submitting) return;
    setOpen(false);
  }, [submitting, setOpen]);

  const handleSubmit = useCallback(async () => {
    if (!activeProfile || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const trimmed = cwd.trim();
      let expanded: string | undefined;
      if (trimmed) {
        expanded = await fsExpandPath({ path: trimmed });
        const exists = await fsPathIsDir({ path: expanded });
        if (!exists) {
          setError(`Directory does not exist: ${expanded}`);
          setSubmitting(false);
          return;
        }
        addRecentDir(expanded);
      }

      await createTabWithLayout({
        profile: activeProfile,
        cwd: expanded,
        layout,
      });
      setOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to open terminal: ${message}`);
      setSubmitting(false);
    }
  }, [activeProfile, submitting, cwd, layout, createTabWithLayout, setOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        handleClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, handleClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="new-tab-backdrop"
          className="mt-opentab__backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <motion.div
            className="mt-opentab"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mt-opentab-title"
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <header className="mt-opentab__header">
              <div className="mt-opentab__title">
                <Plus size={16} aria-hidden="true" />
                <span id="mt-opentab-title">New terminal</span>
              </div>
              <button
                type="button"
                className="mt-opentab__close"
                onClick={handleClose}
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </header>

            <div className="mt-opentab__body">
              <section className="mt-opentab__section">
                <label className="mt-opentab__label">Profile</label>
                {profiles.length === 0 ? (
                  <div className="mt-opentab__empty">
                    No profiles configured. Open Settings → Profiles to add one.
                  </div>
                ) : (
                  <div
                    className="mt-opentab__profiles"
                    role="radiogroup"
                    aria-label="Terminal profile"
                  >
                    {profiles.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        role="radio"
                        aria-checked={p.id === profileId}
                        className={clsx("mt-opentab__profile", {
                          "is-selected": p.id === profileId,
                        })}
                        onClick={() => setProfileId(p.id)}
                        style={
                          p.color
                            ? ({
                                "--mt-opentab-profile-color": p.color,
                              } as React.CSSProperties)
                            : undefined
                        }
                      >
                        <TerminalIcon size={14} aria-hidden="true" />
                        <span className="mt-opentab__profile-name">{p.name}</span>
                        {p.isDefault ? (
                          <span className="mt-opentab__profile-badge">default</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="mt-opentab__section">
                <DirectoryPicker
                  value={cwd}
                  homeDir={homeDirRef.current}
                  onChange={setCwd}
                  onConfirm={handleSubmit}
                />
              </section>

              <section className="mt-opentab__section">
                <LayoutPicker value={layout} onChange={setLayout} />
              </section>

              {error ? (
                <div className="mt-opentab__error" role="alert">
                  {error}
                </div>
              ) : null}
            </div>

            <footer className="mt-opentab__footer">
              <button
                type="button"
                className="mt-opentab__btn"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="mt-opentab__btn mt-opentab__btn--primary"
                onClick={handleSubmit}
                disabled={!activeProfile || submitting}
              >
                {submitting ? "Opening…" : "Open"}
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
