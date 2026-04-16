import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useSettingsStore } from "@/store/settings";
import { SettingsSidebar, type SettingsSectionId } from "./SettingsSidebar";
import { Appearance } from "./sections/Appearance";
import { Terminal } from "./sections/Terminal";
import { Keybindings } from "./sections/Keybindings";
import { Profiles } from "./sections/Profiles";
import { Advanced } from "./sections/Advanced";
import "./Settings.css";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>("appearance");
  const reset = useSettingsStore((s) => s.reset);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleReset = () => {
    const confirmed = window.confirm(
      "Reset all settings to defaults? This cannot be undone.",
    );
    if (confirmed) reset();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="settings-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            className="settings-modal"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="settings-header">
              <h1 className="settings-header__title" id="settings-title">
                Settings
              </h1>
              <button
                type="button"
                className="settings-header__close"
                onClick={onClose}
                aria-label="Close settings"
              >
                <X size={16} />
              </button>
            </header>

            <div className="settings-body">
              <SettingsSidebar
                activeSection={activeSection}
                onChange={setActiveSection}
              />
              <div className="settings-content">
                {activeSection === "appearance" && <Appearance />}
                {activeSection === "terminal" && <Terminal />}
                {activeSection === "keybindings" && <Keybindings />}
                {activeSection === "profiles" && <Profiles />}
                {activeSection === "advanced" && <Advanced />}
              </div>
            </div>

            <footer className="settings-footer">
              <button
                type="button"
                className="settings-btn settings-btn--danger"
                onClick={handleReset}
              >
                Reset to defaults
              </button>
              <button
                type="button"
                className="settings-btn settings-btn--primary"
                onClick={onClose}
              >
                Close
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
