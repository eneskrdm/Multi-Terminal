import {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { ChevronDown, Plus } from "lucide-react";
import type { Profile } from "@/types";
import { resolveTabIcon } from "./Tab";

interface NewTabButtonProps {
  profiles: Profile[];
  defaultProfileId: string;
  onCreate: (profile: Profile) => void;
  onOpenDialog: () => void;
}

const LONG_PRESS_MS = 380;

export function NewTabButton({ profiles, defaultProfileId, onCreate, onOpenDialog }: NewTabButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);

  const defaultProfile =
    profiles.find((p) => p.id === defaultProfileId) ??
    profiles.find((p) => p.isDefault) ??
    profiles[0];

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleDocPointer = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (wrapperRef.current && target && !wrapperRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", handleDocPointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handleDocPointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  useEffect(() => clearLongPress, [clearLongPress]);

  const handleMainPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    longPressTriggered.current = false;
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      setIsOpen(true);
    }, LONG_PRESS_MS);
  };

  const handleMainPointerUp = () => {
    clearLongPress();
  };

  const handleMainPointerLeave = () => {
    clearLongPress();
  };

  const handleMainClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      e.preventDefault();
      return;
    }
    onOpenDialog();
  };

  const handleChevronClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsOpen((o) => !o);
  };

  const handleMainKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const selectProfile = (profile: Profile) => {
    setIsOpen(false);
    onCreate(profile);
  };

  const hasProfiles = profiles.length > 0;

  return (
    <div className="mt-newtab" ref={wrapperRef}>
      <button
        type="button"
        className={clsx("mt-newtab__btn", { "mt-newtab__btn--single": !hasProfiles })}
        onPointerDown={handleMainPointerDown}
        onPointerUp={handleMainPointerUp}
        onPointerLeave={handleMainPointerLeave}
        onPointerCancel={handleMainPointerLeave}
        onClick={handleMainClick}
        onKeyDown={handleMainKeyDown}
        aria-label="New tab"
        title="New terminal…"
      >
        <Plus size={15} strokeWidth={2.2} />
      </button>

      {hasProfiles && (
        <button
          type="button"
          className={clsx("mt-newtab__chevron", { "mt-newtab__chevron--open": isOpen })}
          onClick={handleChevronClick}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label="Choose profile for new tab"
        >
          <ChevronDown size={12} strokeWidth={2.4} />
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="menu"
            className="mt-newtab__menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
          >
            {profiles.length === 0 ? (
              <div className="mt-newtab__menu-empty">No profiles configured</div>
            ) : (
              profiles.map((profile) => {
                const Icon = resolveTabIcon(profile.icon, profile.name);
                const isDefault = profile.id === defaultProfileId || profile.isDefault;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    role="menuitem"
                    className="mt-newtab__menu-item"
                    onClick={() => selectProfile(profile)}
                  >
                    <span
                      className="mt-newtab__menu-item-icon"
                      style={profile.color ? { color: profile.color } : undefined}
                      aria-hidden="true"
                    >
                      <Icon size={14} strokeWidth={2} />
                    </span>
                    <span className="mt-newtab__menu-item-name">{profile.name}</span>
                    {isDefault && (
                      <span className="mt-newtab__menu-item-default">Default</span>
                    )}
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
