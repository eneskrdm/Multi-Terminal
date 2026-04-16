import {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import {
  Bot,
  Code2,
  Container,
  LucideIcon,
  Server,
  SquareDashed,
  SquareTerminal,
  Terminal,
  TerminalSquare,
  X,
  Zap,
} from "lucide-react";
import type { Profile, Tab as TabType } from "@/types";

interface TabProps {
  tab: TabType;
  index: number;
  isActive: boolean;
  isDragging: boolean;
  profile: Profile | undefined;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onPointerDownStart: (e: ReactPointerEvent<HTMLDivElement>, index: number) => void;
  registerRef: (index: number, el: HTMLDivElement | null) => void;
}

export function resolveTabIcon(
  iconKey: string | undefined,
  profileName: string | undefined,
): LucideIcon {
  const haystack = `${iconKey ?? ""} ${profileName ?? ""}`.toLowerCase();
  if (/(power[\s-]?shell|\bpwsh\b|\bps\b)/.test(haystack)) return TerminalSquare;
  if (/(\bbash\b|\bzsh\b|\bfish\b|\bsh\b)/.test(haystack)) return Terminal;
  if (/(cmd|command[\s-]?prompt|\bconhost\b)/.test(haystack)) return SquareTerminal;
  if (/(wsl|ubuntu|debian|linux|alpine)/.test(haystack)) return Container;
  if (/(ssh|remote|server)/.test(haystack)) return Server;
  if (/(node|npm|pnpm|yarn|deno|bun)/.test(haystack)) return Code2;
  if (/(git[\s-]?bash|msys|mingw)/.test(haystack)) return Terminal;
  if (/(nu|nushell|xonsh)/.test(haystack)) return Zap;
  if (/(ai|copilot|agent)/.test(haystack)) return Bot;
  if (!iconKey && !profileName) return SquareDashed;
  return Terminal;
}

export function Tab(props: TabProps) {
  const {
    tab,
    index,
    isActive,
    isDragging,
    profile,
    onActivate,
    onClose,
    onRename,
    onPointerDownStart,
    registerRef,
  } = props;

  const [isRenaming, setIsRenaming] = useState(false);
  const [draft, setDraft] = useState(tab.title);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isRenaming) setDraft(tab.title);
  }, [tab.title, isRenaming]);

  useEffect(() => {
    if (isRenaming) {
      const input = inputRef.current;
      if (input) {
        input.focus();
        input.select();
      }
    }
  }, [isRenaming]);

  const Icon = useMemo(
    () => resolveTabIcon(tab.icon ?? profile?.icon, profile?.name),
    [tab.icon, profile?.icon, profile?.name],
  );

  const accentColor = tab.color ?? profile?.color;

  const commitRename = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed.length > 0 && trimmed !== tab.title) {
      onRename(tab.id, trimmed);
    }
    setIsRenaming(false);
  }, [draft, onRename, tab.id, tab.title]);

  const cancelRename = useCallback(() => {
    setDraft(tab.title);
    setIsRenaming(false);
  }, [tab.title]);

  const handleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (isRenaming) return;
    onActivate(tab.id);
  };

  const handleAuxClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.button === 1) {
      e.preventDefault();
      onClose(tab.id);
    }
  };

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.button === 1) {
      e.preventDefault();
    }
  };

  const handleTitleDoubleClick = (e: ReactMouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    setDraft(tab.title);
    setIsRenaming(true);
  };

  const handleInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitRename();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelRename();
    }
    e.stopPropagation();
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (isRenaming) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate(tab.id);
    } else if (e.key === "Delete" || (e.key === "w" && (e.ctrlKey || e.metaKey))) {
      e.preventDefault();
      onClose(tab.id);
    } else if (e.key === "F2") {
      e.preventDefault();
      setDraft(tab.title);
      setIsRenaming(true);
    }
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (isRenaming) return;
    if (e.button !== 0) return;
    onPointerDownStart(e, index);
  };

  const handleCloseClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    onClose(tab.id);
  };

  const assignRef = (el: HTMLDivElement | null) => {
    rootRef.current = el;
    registerRef(index, el);
  };

  const iconStyle = accentColor ? { color: accentColor } : undefined;

  return (
    <motion.div
      layout
      layoutId={`tab-${tab.id}`}
      initial={{ opacity: 0, y: -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 520, damping: 40, mass: 0.7 }}
      ref={assignRef}
      role="tab"
      aria-selected={isActive}
      aria-label={tab.title}
      tabIndex={isActive ? 0 : -1}
      data-tab-id={tab.id}
      data-tab-index={index}
      className={clsx("mt-tab", {
        "mt-tab--active": isActive,
        "mt-tab--dragging": isDragging,
      })}
      onClick={handleClick}
      onAuxClick={handleAuxClick}
      onMouseDown={handleMouseDown}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
    >
      <span className="mt-tab__icon" style={iconStyle} aria-hidden="true">
        <Icon size={14} strokeWidth={2} />
      </span>

      {isRenaming ? (
        <input
          ref={inputRef}
          type="text"
          className="mt-tab__title-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={handleInputKeyDown}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          maxLength={120}
          spellCheck={false}
          aria-label="Rename tab"
        />
      ) : (
        <span
          className="mt-tab__title"
          onDoubleClick={handleTitleDoubleClick}
          title={tab.title}
        >
          {tab.title}
        </span>
      )}

      <button
        type="button"
        className="mt-tab__close"
        onClick={handleCloseClick}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={`Close tab ${tab.title}`}
        tabIndex={-1}
      >
        <X size={12} strokeWidth={2.5} />
      </button>
    </motion.div>
  );
}
