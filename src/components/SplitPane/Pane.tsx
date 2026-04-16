import { useCallback, useEffect, useMemo, useRef } from "react";
import clsx from "clsx";
import { Terminal } from "@/components/Terminal";
import { useLayoutStore } from "@/store/layout";
import { useTabsStore } from "@/store/tabs";
import { useTerminalsStore } from "@/store/terminals";
import { useSettingsStore } from "@/store/settings";
import {
  terminalCreate,
  terminalKill,
} from "@/lib/tauri";
import { emit, on } from "@/lib/events";
import type { PaneNode, PaneNodeLeaf, Profile, SplitDirection } from "@/types";

interface PaneProps {
  node: PaneNodeLeaf;
  tabId: string;
  isFocused: boolean;
}

function resolveProfile(tabId: string): Profile | undefined {
  const tab = useTabsStore.getState().tabs.find((t) => t.id === tabId);
  const settings = useSettingsStore.getState().settings;
  if (!settings) return undefined;
  const profiles = settings.profiles ?? [];
  if (tab) {
    const match = profiles.find((p) => p.id === tab.profileId);
    if (match) return match;
  }
  const def = profiles.find((p) => p.id === settings.defaultProfileId);
  if (def) return def;
  return profiles.find((p) => p.isDefault) ?? profiles[0];
}

interface LeafRect {
  node: PaneNodeLeaf;
  rect: DOMRect;
}

function collectLeafRects(): LeafRect[] {
  const nodes = document.querySelectorAll<HTMLElement>("[data-pane-leaf-id]");
  const panesById = useLayoutStore.getState().panes;
  const out: LeafRect[] = [];
  nodes.forEach((el) => {
    const id = el.getAttribute("data-pane-leaf-id");
    if (!id) return;
    const pane = panesById[id];
    if (!pane || pane.type !== "leaf") return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    out.push({ node: pane, rect });
  });
  return out;
}

function findAdjacentLeaf(
  fromRect: DOMRect,
  fromId: string,
  direction: "left" | "right" | "up" | "down",
  candidates: LeafRect[],
): PaneNodeLeaf | null {
  const cx = fromRect.left + fromRect.width / 2;
  const cy = fromRect.top + fromRect.height / 2;

  let best: { leaf: PaneNodeLeaf; distance: number } | null = null;

  for (const c of candidates) {
    if (c.node.id === fromId) continue;
    const ccx = c.rect.left + c.rect.width / 2;
    const ccy = c.rect.top + c.rect.height / 2;
    const dx = ccx - cx;
    const dy = ccy - cy;

    let valid = false;
    switch (direction) {
      case "left":
        valid = dx < -1 && Math.abs(dy) <= Math.abs(dx) * 1.2 + 4;
        break;
      case "right":
        valid = dx > 1 && Math.abs(dy) <= Math.abs(dx) * 1.2 + 4;
        break;
      case "up":
        valid = dy < -1 && Math.abs(dx) <= Math.abs(dy) * 1.2 + 4;
        break;
      case "down":
        valid = dy > 1 && Math.abs(dx) <= Math.abs(dy) * 1.2 + 4;
        break;
    }
    if (!valid) continue;

    // Require vertical/horizontal overlap (the pane's edge must cross the
    // axis of travel) — this keeps navigation intuitive in nested splits.
    const overlaps = (() => {
      if (direction === "left" || direction === "right") {
        return c.rect.top < fromRect.bottom && c.rect.bottom > fromRect.top;
      }
      return c.rect.left < fromRect.right && c.rect.right > fromRect.left;
    })();
    if (!overlaps) continue;

    const distance = Math.hypot(dx, dy);
    if (!best || distance < best.distance) {
      best = { leaf: c.node, distance };
    }
  }

  return best?.leaf ?? null;
}

function hasSiblingsOrParent(
  pane: PaneNodeLeaf,
  panes: Record<string, PaneNode>,
): boolean {
  if (!pane.parentId) return false;
  const parent = panes[pane.parentId];
  if (!parent || parent.type !== "split") return false;
  return parent.children.length > 1;
}

export function Pane({ node, tabId, isFocused }: PaneProps): JSX.Element {
  const updateTab = useTabsStore((s) => s.updateTab);
  const paneRootRef = useRef<HTMLDivElement | null>(null);

  const isFocusedRef = useRef<boolean>(isFocused);
  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  const nodeRef = useRef<PaneNodeLeaf>(node);
  useEffect(() => {
    nodeRef.current = node;
  }, [node]);

  const tabIdRef = useRef<string>(tabId);
  useEffect(() => {
    tabIdRef.current = tabId;
  }, [tabId]);

  const handleFocus = useCallback(() => {
    const currentTabId = tabIdRef.current;
    if (!currentTabId) return;
    const tab = useTabsStore.getState().tabs.find((t) => t.id === currentTabId);
    if (!tab) return;
    if (tab.activePaneId === nodeRef.current.id) return;
    updateTab(currentTabId, { activePaneId: nodeRef.current.id });
  }, [updateTab]);

  const handlePaneSplit = useCallback(
    async (direction: SplitDirection) => {
      const currentTabId = tabIdRef.current;
      const leaf = nodeRef.current;
      const profile = resolveProfile(currentTabId);
      if (!profile) {
        // eslint-disable-next-line no-console
        console.warn("[Pane] no profile available for split");
        return;
      }

      const host = paneRootRef.current;
      const baseCols = 80;
      const baseRows = 24;
      let cols = baseCols;
      let rows = baseRows;
      if (host) {
        const rect = host.getBoundingClientRect();
        // Rough cell size estimate — backend will be corrected by the fit on mount.
        const charW = 8;
        const charH = 17;
        const nextCols = Math.max(10, Math.floor((rect.width / (direction === "horizontal" ? 2 : 1)) / charW));
        const nextRows = Math.max(6, Math.floor((rect.height / (direction === "vertical" ? 2 : 1)) / charH));
        cols = nextCols;
        rows = nextRows;
      }

      try {
        const process = await terminalCreate({ profile, cols, rows });
        useTerminalsStore.getState().addTerminal(process);
        const layout = useLayoutStore.getState();
        const newLeafId = layout.splitPane(leaf.id, direction, process.id);
        const activeId = newLeafId ?? leaf.id;
        updateTab(currentTabId, { activePaneId: activeId });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[Pane] failed to split", err);
      }
    },
    [updateTab],
  );

  const handlePaneClose = useCallback(async () => {
    const currentTabId = tabIdRef.current;
    const leaf = nodeRef.current;
    const panes = useLayoutStore.getState().panes;
    const terminalId = leaf.terminalId;

    const lastPaneInTab = !hasSiblingsOrParent(leaf, panes);

    if (lastPaneInTab) {
      // closeTab takes care of terminal killing + pane cleanup.
      try {
        await useTabsStore.getState().closeTab(currentTabId);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[Pane] failed to close tab", err);
      }
      return;
    }

    try {
      await terminalKill({ id: terminalId });
    } catch {
      /* terminal may already be exited */
    }
    useTerminalsStore.getState().removeTerminal(terminalId);
    useLayoutStore.getState().closePane(leaf.id);

    // After collapsing, the active pane pointer may dangle — reassign to a
    // surviving leaf within this tab.
    const layoutAfter = useLayoutStore.getState().panes;
    const tab = useTabsStore.getState().tabs.find((t) => t.id === currentTabId);
    if (!tab) return;
    if (layoutAfter[tab.activePaneId]) return;

    const survivor = findFirstLeaf(tab.rootPaneId, layoutAfter);
    if (survivor) {
      updateTab(currentTabId, { activePaneId: survivor });
    }
  }, [updateTab]);

  const handlePaneFocusDirection = useCallback(
    (direction: "left" | "right" | "up" | "down") => {
      const host = paneRootRef.current;
      if (!host) return;
      const fromRect = host.getBoundingClientRect();
      const candidates = collectLeafRects();
      const target = findAdjacentLeaf(fromRect, nodeRef.current.id, direction, candidates);
      if (!target) return;
      // Only move focus within the same tab.
      const currentTabId = tabIdRef.current;
      const tab = useTabsStore.getState().tabs.find((t) => t.id === currentTabId);
      if (!tab) return;
      const reachable = isLeafDescendantOf(target.id, tab.rootPaneId);
      if (!reachable) return;
      updateTab(currentTabId, { activePaneId: target.id });
      // Bring xterm focus along.
      requestAnimationFrame(() => emit({ type: "focus-active-terminal" }));
    },
    [updateTab],
  );

  useEffect(() => {
    const unsubs: Array<() => void> = [];
    unsubs.push(
      on("pane-split", (e) => {
        if (!isFocusedRef.current) return;
        void handlePaneSplit(e.direction);
      }),
    );
    unsubs.push(
      on("pane-close", () => {
        if (!isFocusedRef.current) return;
        void handlePaneClose();
      }),
    );
    unsubs.push(
      on("pane-focus", (e) => {
        if (!isFocusedRef.current) return;
        handlePaneFocusDirection(e.direction);
      }),
    );
    return () => {
      for (const u of unsubs) u();
    };
  }, [handlePaneSplit, handlePaneClose, handlePaneFocusDirection]);

  const className = useMemo(
    () => clsx("mt-pane", { "mt-pane--focused": isFocused }),
    [isFocused],
  );

  return (
    <div
      className={className}
      ref={paneRootRef}
      data-pane-leaf-id={node.id}
      onPointerDownCapture={handleFocus}
      onFocusCapture={handleFocus}
    >
      <div className="mt-pane__body">
        <Terminal
          terminalId={node.terminalId}
          isFocused={isFocused}
          onFocus={handleFocus}
        />
      </div>
    </div>
  );
}

function findFirstLeaf(
  rootId: string,
  panes: Record<string, PaneNode>,
): string | null {
  const stack: string[] = [rootId];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const node = panes[id];
    if (!node) continue;
    if (node.type === "leaf") return node.id;
    for (const child of node.children) stack.push(child);
  }
  return null;
}

function isLeafDescendantOf(leafId: string, rootId: string): boolean {
  const panes = useLayoutStore.getState().panes;
  const stack: string[] = [rootId];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    if (id === leafId) return true;
    const node = panes[id];
    if (!node) continue;
    if (node.type === "split") {
      for (const child of node.children) stack.push(child);
    }
  }
  return false;
}
