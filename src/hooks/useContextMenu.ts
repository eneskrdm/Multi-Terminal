import {
  createElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  ContextMenu,
  type ContextMenuItem,
} from "@/components/ContextMenu";

export type { ContextMenuItem } from "@/components/ContextMenu";

// ----------------------------------------------------------------------------
// Singleton store — only one context menu can be open at a time.
// A tiny pub/sub so every `useContextMenu` consumer sees the same state
// without needing a top-level host component mounted anywhere.
// ----------------------------------------------------------------------------
interface MenuState {
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  // Changes each time `openMenu` is called. Used as a React `key` so the menu
  // remounts cleanly when coordinates change while already visible.
  token: number;
  // Monotonic renderer-election epoch, incremented whenever the pool of
  // mounted hooks changes so consumers can re-pick who renders the portal.
  epoch: number;
}

type Listener = (state: MenuState) => void;

const listeners = new Set<Listener>();
let state: MenuState = {
  visible: false,
  x: 0,
  y: 0,
  items: [],
  token: 0,
  epoch: 0,
};

function notify(): void {
  for (const l of listeners) l(state);
}

function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function openMenuImpl(
  x: number,
  y: number,
  items: ContextMenuItem[],
): void {
  state = {
    ...state,
    visible: true,
    x,
    y,
    items,
    token: state.token + 1,
  };
  notify();
}

function closeMenuImpl(): void {
  if (!state.visible) return;
  state = { ...state, visible: false };
  notify();
}

// ----------------------------------------------------------------------------
// Imperative API — useful for callers that don't want to mount the hook.
// ----------------------------------------------------------------------------
export function openContextMenu(
  x: number,
  y: number,
  items: ContextMenuItem[],
): void {
  openMenuImpl(x, y, items);
}

export function closeContextMenu(): void {
  closeMenuImpl();
}

// ----------------------------------------------------------------------------
// Renderer election: exactly one live hook renders the portal, preventing
// duplicates when multiple components use the hook simultaneously.
// ----------------------------------------------------------------------------
const renderers: number[] = [];
let nextRendererId = 1;

function bumpEpoch(): void {
  state = { ...state, epoch: state.epoch + 1 };
  notify();
}

function registerRenderer(): number {
  const id = nextRendererId++;
  renderers.push(id);
  bumpEpoch();
  return id;
}

function unregisterRenderer(id: number): void {
  const idx = renderers.indexOf(id);
  if (idx !== -1) renderers.splice(idx, 1);
  bumpEpoch();
}

function primaryRendererId(): number | null {
  return renderers.length > 0 ? renderers[0] : null;
}

// ----------------------------------------------------------------------------
// Hook
// ----------------------------------------------------------------------------
export interface UseContextMenuResult {
  openMenu: (x: number, y: number, items: ContextMenuItem[]) => void;
  closeMenu: () => void;
  menu: ReactNode;
}

export function useContextMenu(): UseContextMenuResult {
  const [snapshot, setSnapshot] = useState<MenuState>(state);
  const rendererIdRef = useRef<number | null>(null);

  useEffect(() => {
    const id = registerRenderer();
    rendererIdRef.current = id;
    const unsub = subscribe(setSnapshot);
    setSnapshot(state);
    return () => {
      unregisterRenderer(id);
      unsub();
      rendererIdRef.current = null;
    };
  }, []);

  const handleOpen = useCallback(
    (x: number, y: number, items: ContextMenuItem[]) => {
      openMenuImpl(x, y, items);
    },
    [],
  );

  const handleClose = useCallback(() => {
    closeMenuImpl();
  }, []);

  const myId = rendererIdRef.current;
  const amPrimary = myId !== null && primaryRendererId() === myId;

  let menu: ReactNode = null;
  if (snapshot.visible && typeof document !== "undefined" && amPrimary) {
    menu = createPortal(
      createElement(ContextMenu, {
        key: snapshot.token,
        x: snapshot.x,
        y: snapshot.y,
        items: snapshot.items,
        onClose: handleClose,
      }),
      document.body,
    );
  }
  // `snapshot.epoch` is deliberately referenced here so React re-evaluates
  // rendering when the renderer pool changes, even if visibility didn't.
  void snapshot.epoch;

  return {
    openMenu: handleOpen,
    closeMenu: handleClose,
    menu,
  };
}
