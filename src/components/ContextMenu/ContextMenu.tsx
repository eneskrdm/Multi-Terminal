import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import clsx from "clsx";
import {
  ChevronRight,
  Clipboard,
  ClipboardPaste,
  Copy,
  Eraser,
  ExternalLink,
  Eye,
  FileText,
  Folder,
  Maximize2,
  Minus,
  MoreHorizontal,
  Palette,
  Pencil,
  Plus,
  Scissors,
  Search,
  Settings as SettingsIcon,
  Split,
  SplitSquareHorizontal,
  SplitSquareVertical,
  Square,
  Star,
  Terminal,
  Trash,
  Type,
  X,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react";

import "./ContextMenu.css";

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------
export type ContextMenuItem =
  | {
      type: "item";
      label: string;
      icon?: string;
      accelerator?: string;
      disabled?: boolean;
      onSelect: () => void;
    }
  | { type: "separator" }
  | {
      type: "submenu";
      label: string;
      icon?: string;
      items: ContextMenuItem[];
    };

// ----------------------------------------------------------------------------
// Icon name → lucide component mapping
// ----------------------------------------------------------------------------
const ICON_MAP: Record<string, LucideIcon> = {
  Copy,
  Clipboard,
  ClipboardPaste,
  Paste: ClipboardPaste,
  Cut: Scissors,
  Scissors,
  Search,
  Terminal,
  Split,
  SplitHorizontal: SplitSquareHorizontal,
  SplitVertical: SplitSquareVertical,
  SplitSquareHorizontal,
  SplitSquareVertical,
  Close: X,
  X,
  Plus,
  Minus,
  Eraser,
  Clear: Eraser,
  Trash,
  Delete: Trash,
  Folder,
  Pencil,
  Rename: Pencil,
  Settings: SettingsIcon,
  Palette,
  Type,
  ZoomIn,
  ZoomOut,
  Maximize: Maximize2,
  Maximize2,
  Star,
  Square,
  Eye,
  FileText,
  ExternalLink,
  More: MoreHorizontal,
  MoreHorizontal,
};

function renderIcon(name?: string): JSX.Element | null {
  if (!name) return null;
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return <Icon className="mt-ctx__icon" aria-hidden="true" />;
}

// ----------------------------------------------------------------------------
// Geometry helper — shift coordinates so the menu fits inside the viewport.
// ----------------------------------------------------------------------------
interface Position {
  x: number;
  y: number;
}

function clampInViewport(
  desired: Position,
  size: { width: number; height: number },
): Position {
  const margin = 6;
  const vw = typeof window !== "undefined" ? window.innerWidth : size.width;
  const vh = typeof window !== "undefined" ? window.innerHeight : size.height;

  let x = desired.x;
  let y = desired.y;

  if (x + size.width + margin > vw) {
    x = Math.max(margin, vw - size.width - margin);
  }
  if (y + size.height + margin > vh) {
    y = Math.max(margin, vh - size.height - margin);
  }
  if (x < margin) x = margin;
  if (y < margin) y = margin;

  return { x, y };
}

// ----------------------------------------------------------------------------
// Types for focusable rows
// ----------------------------------------------------------------------------
type FocusableIndex = number;

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

// ----------------------------------------------------------------------------
// ContextMenu (a single menu panel, used recursively for submenus)
// ----------------------------------------------------------------------------
export function ContextMenu({
  x,
  y,
  items,
  onClose,
}: ContextMenuProps): JSX.Element {
  return (
    <MenuPanel
      x={x}
      y={y}
      items={items}
      onClose={onClose}
      isRoot
      autoFocus
    />
  );
}

interface MenuPanelProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  isRoot?: boolean;
  autoFocus?: boolean;
  onDismissBranch?: () => void;
}

function focusableIndices(items: ContextMenuItem[]): FocusableIndex[] {
  const out: FocusableIndex[] = [];
  items.forEach((item, idx) => {
    if (item.type === "separator") return;
    if (item.type === "item" && item.disabled) return;
    out.push(idx);
  });
  return out;
}

function MenuPanel({
  x,
  y,
  items,
  onClose,
  isRoot = false,
  autoFocus = false,
  onDismissBranch,
}: MenuPanelProps): JSX.Element {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<Position>({ x, y });
  const [ready, setReady] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [openSubmenuIdx, setOpenSubmenuIdx] = useState<number | null>(null);
  const [submenuAnchor, setSubmenuAnchor] = useState<Position | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusables = useMemo(() => focusableIndices(items), [items]);

  // Position the panel after mount so we know its size.
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const fit = clampInViewport(
      { x, y },
      { width: rect.width, height: rect.height },
    );
    setPosition(fit);
    setReady(true);
  }, [x, y, items]);

  // Auto-focus the first focusable item on mount (root menu).
  useEffect(() => {
    if (!autoFocus) return;
    if (focusables.length === 0) return;
    const firstIdx = focusables[0];
    setActiveIdx(firstIdx);
    // Move focus after the layout settles.
    const t = window.setTimeout(() => {
      itemRefs.current[firstIdx]?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [autoFocus, focusables]);

  // Root-only: click outside closes; Esc at document level closes.
  useEffect(() => {
    if (!isRoot) return;

    const isInsideAnyMenu = (target: Node | null): boolean => {
      if (!target) return false;
      const el = target instanceof Element ? target : target.parentElement;
      if (!el) return false;
      return !!el.closest(".mt-ctx");
    };

    const handlePointerDown = (event: PointerEvent): void => {
      if (isInsideAnyMenu(event.target as Node | null)) return;
      onClose();
    };

    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    const handleBlur = (): void => {
      onClose();
    };

    const handleContextMenu = (event: MouseEvent): void => {
      if (isInsideAnyMenu(event.target as Node | null)) {
        event.preventDefault();
        return;
      }
      onClose();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKey, true);
    document.addEventListener("contextmenu", handleContextMenu, true);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("resize", onClose);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKey, true);
      document.removeEventListener("contextmenu", handleContextMenu, true);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("resize", onClose);
    };
  }, [isRoot, onClose]);

  const clearHoverTimer = useCallback((): void => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return clearHoverTimer;
  }, [clearHoverTimer]);

  const openSubmenuAt = useCallback(
    (idx: number, anchor: HTMLElement) => {
      const rect = anchor.getBoundingClientRect();
      setOpenSubmenuIdx(idx);
      setSubmenuAnchor({ x: rect.right - 2, y: rect.top });
    },
    [],
  );

  const closeSubmenu = useCallback(() => {
    setOpenSubmenuIdx(null);
    setSubmenuAnchor(null);
  }, []);

  const handleItemClick = (idx: number, item: ContextMenuItem): void => {
    if (item.type === "item") {
      if (item.disabled) return;
      onClose();
      // Defer selection until after close to avoid re-render races.
      queueMicrotask(() => item.onSelect());
    } else if (item.type === "submenu") {
      const el = itemRefs.current[idx];
      if (el) openSubmenuAt(idx, el);
    }
  };

  const handleItemMouseEnter = (
    idx: number,
    item: ContextMenuItem,
    event: ReactMouseEvent<HTMLButtonElement>,
  ): void => {
    if (item.type === "separator") return;
    if (item.type === "item" && item.disabled) {
      setActiveIdx(null);
      return;
    }
    setActiveIdx(idx);
    clearHoverTimer();

    if (item.type === "submenu") {
      const target = event.currentTarget;
      hoverTimerRef.current = window.setTimeout(() => {
        openSubmenuAt(idx, target);
      }, 250);
    } else {
      if (openSubmenuIdx !== null) {
        hoverTimerRef.current = window.setTimeout(() => {
          closeSubmenu();
        }, 200);
      }
    }
  };

  const moveActive = (delta: 1 | -1): void => {
    if (focusables.length === 0) return;
    const currentIdx = activeIdx === null ? -1 : focusables.indexOf(activeIdx);
    let nextIdx: number;
    if (currentIdx === -1) {
      nextIdx = delta === 1 ? 0 : focusables.length - 1;
    } else {
      nextIdx = (currentIdx + delta + focusables.length) % focusables.length;
    }
    const target = focusables[nextIdx];
    setActiveIdx(target);
    itemRefs.current[target]?.focus();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      if (focusables.length > 0) {
        setActiveIdx(focusables[0]);
        itemRefs.current[focusables[0]]?.focus();
      }
    } else if (event.key === "End") {
      event.preventDefault();
      if (focusables.length > 0) {
        const last = focusables[focusables.length - 1];
        setActiveIdx(last);
        itemRefs.current[last]?.focus();
      }
    } else if (event.key === "Enter" || event.key === " ") {
      if (activeIdx === null) return;
      const item = items[activeIdx];
      if (!item) return;
      event.preventDefault();
      handleItemClick(activeIdx, item);
    } else if (event.key === "ArrowRight") {
      if (activeIdx === null) return;
      const item = items[activeIdx];
      if (!item || item.type !== "submenu") return;
      event.preventDefault();
      const el = itemRefs.current[activeIdx];
      if (el) openSubmenuAt(activeIdx, el);
    } else if (event.key === "ArrowLeft") {
      if (!isRoot && onDismissBranch) {
        event.preventDefault();
        onDismissBranch();
      }
    }
  };

  const activeSubmenuItems = useMemo(() => {
    if (openSubmenuIdx === null) return null;
    const found = items[openSubmenuIdx];
    if (!found || found.type !== "submenu") return null;
    return found.items;
  }, [items, openSubmenuIdx]);

  return (
    <>
      <div
        ref={panelRef}
        className={clsx("mt-ctx", {
          "mt-ctx--ready": ready,
        })}
        role="menu"
        aria-orientation="vertical"
        tabIndex={-1}
        style={{ left: position.x, top: position.y }}
        data-mt-ctx-root={isRoot ? "true" : undefined}
        onKeyDown={handleKeyDown}
      >
        {items.map((item, idx) => {
          if (item.type === "separator") {
            return (
              <div
                key={`sep-${idx}`}
                className="mt-ctx__separator"
                role="separator"
              />
            );
          }

          const label = item.label;
          const isActive = activeIdx === idx;
          const isSubmenuOpen = openSubmenuIdx === idx;
          const isDisabled = item.type === "item" && item.disabled === true;

          return (
            <button
              key={`${item.type}-${idx}-${label}`}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              type="button"
              role="menuitem"
              disabled={isDisabled}
              aria-haspopup={item.type === "submenu" ? "menu" : undefined}
              aria-expanded={item.type === "submenu" ? isSubmenuOpen : undefined}
              className={clsx("mt-ctx__item", {
                "mt-ctx__item--active": isActive || isSubmenuOpen,
                "mt-ctx__item--disabled": isDisabled,
                "mt-ctx__item--submenu": item.type === "submenu",
              })}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleItemClick(idx, item)}
              onMouseEnter={(e) => handleItemMouseEnter(idx, item, e)}
              onFocus={() => setActiveIdx(idx)}
            >
              <span className="mt-ctx__icon-slot" aria-hidden="true">
                {renderIcon(item.icon)}
              </span>
              <span className="mt-ctx__label">{label}</span>
              {item.type === "item" && item.accelerator ? (
                <span className="mt-ctx__accel">{item.accelerator}</span>
              ) : null}
              {item.type === "submenu" ? (
                <span className="mt-ctx__chevron" aria-hidden="true">
                  <ChevronRight size={12} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {openSubmenuIdx !== null && submenuAnchor && activeSubmenuItems ? (
        <MenuPanel
          x={submenuAnchor.x}
          y={submenuAnchor.y}
          items={activeSubmenuItems}
          onClose={onClose}
          onDismissBranch={closeSubmenu}
        />
      ) : null}
    </>
  );
}
