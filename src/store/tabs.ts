import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { nanoid } from "nanoid";
import type { PaneNode, PaneNodeLeaf, Profile, Tab } from "@/types";
import { terminalCreate, terminalKill } from "@/lib/tauri";
import { useTerminalsStore } from "./terminals";
import { useLayoutStore } from "./layout";

export type PaneLayout =
  | "single"
  | "columns-2"
  | "rows-2"
  | "columns-3"
  | "main-right-stacked"
  | "grid-2x2";

export const PANE_LAYOUT_SIZES: Record<PaneLayout, number> = {
  "single": 1,
  "columns-2": 2,
  "rows-2": 2,
  "columns-3": 3,
  "main-right-stacked": 3,
  "grid-2x2": 4,
};

export interface CreateTabOptions {
  profile: Profile;
  cwd?: string;
  layout?: PaneLayout;
}

export interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;
  setActiveTab: (id: string) => void;
  addTab: (tab: Tab) => void;
  removeTab: (id: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  renameTab: (id: string, title: string) => void;
  updateTab: (id: string, patch: Partial<Tab>) => void;
  createTabWithProfile: (profile: Profile) => Promise<string>;
  createTabWithLayout: (opts: CreateTabOptions) => Promise<string>;
  closeTab: (id: string) => Promise<void>;
}

async function spawnAndSplit(
  paneId: string,
  direction: "horizontal" | "vertical",
  profile: Profile,
): Promise<string> {
  const process = await terminalCreate({ profile, cols: 80, rows: 24 });
  useTerminalsStore.getState().addTerminal(process);
  return useLayoutStore.getState().splitPane(paneId, direction, process.id);
}

function collectLeafPanes(
  rootId: string,
  panes: Record<string, PaneNode>,
): PaneNodeLeaf[] {
  const leaves: PaneNodeLeaf[] = [];
  const stack: string[] = [rootId];
  const seen = new Set<string>();

  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const node = panes[id];
    if (!node) continue;
    if (node.type === "leaf") {
      leaves.push(node);
    } else {
      for (const child of node.children) stack.push(child);
    }
  }
  return leaves;
}

function collectAllPaneIds(
  rootId: string,
  panes: Record<string, PaneNode>,
): string[] {
  const ids: string[] = [];
  const stack: string[] = [rootId];
  const seen = new Set<string>();

  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const node = panes[id];
    if (!node) continue;
    ids.push(id);
    if (node.type === "split") {
      for (const child of node.children) stack.push(child);
    }
  }
  return ids;
}

export const useTabsStore = create<TabsState>()(
  immer((set, get) => ({
    tabs: [],
    activeTabId: null,

    setActiveTab: (id) =>
      set((state) => {
        if (state.tabs.some((t) => t.id === id)) {
          state.activeTabId = id;
        }
      }),

    addTab: (tab) =>
      set((state) => {
        state.tabs.push(tab);
        if (state.activeTabId === null) {
          state.activeTabId = tab.id;
        }
      }),

    removeTab: (id) =>
      set((state) => {
        const idx = state.tabs.findIndex((t) => t.id === id);
        if (idx === -1) return;
        state.tabs.splice(idx, 1);
        if (state.activeTabId === id) {
          if (state.tabs.length === 0) {
            state.activeTabId = null;
          } else if (idx < state.tabs.length) {
            state.activeTabId = state.tabs[idx].id;
          } else {
            state.activeTabId = state.tabs[state.tabs.length - 1].id;
          }
        }
      }),

    reorderTabs: (fromIndex, toIndex) =>
      set((state) => {
        if (
          fromIndex < 0 ||
          fromIndex >= state.tabs.length ||
          toIndex < 0 ||
          toIndex >= state.tabs.length ||
          fromIndex === toIndex
        ) {
          return;
        }
        const [moved] = state.tabs.splice(fromIndex, 1);
        state.tabs.splice(toIndex, 0, moved);
      }),

    renameTab: (id, title) =>
      set((state) => {
        const tab = state.tabs.find((t) => t.id === id);
        if (tab) tab.title = title;
      }),

    updateTab: (id, patch) =>
      set((state) => {
        const tab = state.tabs.find((t) => t.id === id);
        if (tab) Object.assign(tab, patch);
      }),

    createTabWithProfile: async (profile) => {
      const process = await terminalCreate({ profile, cols: 80, rows: 24 });

      const tabId = nanoid();
      const leafId = nanoid();
      const leaf: PaneNodeLeaf = {
        id: leafId,
        type: "leaf",
        terminalId: process.id,
        parentId: null,
      };
      const tab: Tab = {
        id: tabId,
        title: profile.name,
        rootPaneId: leafId,
        activePaneId: leafId,
        profileId: profile.id,
        icon: profile.icon,
        color: profile.color,
      };

      useTerminalsStore.getState().addTerminal(process);
      useLayoutStore.getState().setPane(leaf);

      set((state) => {
        state.tabs.push(tab);
        state.activeTabId = tabId;
      });

      return tabId;
    },

    createTabWithLayout: async ({ profile, cwd, layout = "single" }) => {
      const effectiveProfile: Profile =
        cwd && cwd.trim() ? { ...profile, cwd } : profile;

      const tabId = await get().createTabWithProfile(effectiveProfile);
      const tab = get().tabs.find((t) => t.id === tabId);
      if (!tab) return tabId;

      const rootLeafId = tab.rootPaneId;

      switch (layout) {
        case "single":
          break;
        case "columns-2":
          await spawnAndSplit(rootLeafId, "horizontal", effectiveProfile);
          break;
        case "rows-2":
          await spawnAndSplit(rootLeafId, "vertical", effectiveProfile);
          break;
        case "columns-3": {
          const mid = await spawnAndSplit(rootLeafId, "horizontal", effectiveProfile);
          await spawnAndSplit(mid, "horizontal", effectiveProfile);
          break;
        }
        case "main-right-stacked": {
          const right = await spawnAndSplit(rootLeafId, "horizontal", effectiveProfile);
          await spawnAndSplit(right, "vertical", effectiveProfile);
          break;
        }
        case "grid-2x2": {
          const right = await spawnAndSplit(rootLeafId, "horizontal", effectiveProfile);
          await spawnAndSplit(rootLeafId, "vertical", effectiveProfile);
          await spawnAndSplit(right, "vertical", effectiveProfile);
          break;
        }
      }

      return tabId;
    },

    closeTab: async (id) => {
      const tab = get().tabs.find((t) => t.id === id);
      if (!tab) return;

      const panesSnapshot = useLayoutStore.getState().panes;
      const leaves = collectLeafPanes(tab.rootPaneId, panesSnapshot);
      const allPaneIds = collectAllPaneIds(tab.rootPaneId, panesSnapshot);

      const terminalsStore = useTerminalsStore.getState();
      await Promise.all(
        leaves.map(async (leaf) => {
          const term = terminalsStore.terminals[leaf.terminalId];
          if (term && !term.exited) {
            try {
              await terminalKill({ id: leaf.terminalId });
            } catch {
              // Terminal may already be gone; proceed with cleanup.
            }
          }
        }),
      );

      {
        const store = useTerminalsStore.getState();
        for (const leaf of leaves) {
          store.removeTerminal(leaf.terminalId);
        }
      }

      {
        const layoutStore = useLayoutStore.getState();
        for (const paneId of allPaneIds) {
          layoutStore.removePane(paneId);
        }
      }

      set((state) => {
        const idx = state.tabs.findIndex((t) => t.id === id);
        if (idx === -1) return;
        state.tabs.splice(idx, 1);
        if (state.activeTabId === id) {
          if (state.tabs.length === 0) {
            state.activeTabId = null;
          } else if (idx < state.tabs.length) {
            state.activeTabId = state.tabs[idx].id;
          } else {
            state.activeTabId = state.tabs[state.tabs.length - 1].id;
          }
        }
      });
    },
  })),
);
