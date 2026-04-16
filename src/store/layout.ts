import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { nanoid } from "nanoid";
import type { PaneNode, PaneNodeLeaf, PaneNodeSplit, SplitDirection } from "@/types";
import { useTabsStore } from "./tabs";

export interface LayoutState {
  panes: Record<string, PaneNode>;
  setPane: (pane: PaneNode) => void;
  removePane: (id: string) => void;
  splitPane: (
    paneId: string,
    direction: SplitDirection,
    newTerminalId: string,
  ) => string;
  closePane: (paneId: string) => void;
  resizeSplit: (splitId: string, sizes: number[]) => void;
}

function normalizeSizes(sizes: number[]): number[] {
  const sum = sizes.reduce((acc, n) => acc + n, 0);
  if (sum <= 0) {
    const equal = 1 / sizes.length;
    return sizes.map(() => equal);
  }
  return sizes.map((s) => s / sum);
}

function equalSizes(count: number): number[] {
  const share = 1 / count;
  return Array.from({ length: count }, () => share);
}

export const useLayoutStore = create<LayoutState>()(
  immer((set) => ({
    panes: {},

    setPane: (pane) =>
      set((state) => {
        state.panes[pane.id] = pane;
      }),

    removePane: (id) =>
      set((state) => {
        delete state.panes[id];
      }),

    splitPane: (paneId, direction, newTerminalId) => {
      const newLeafId = nanoid();

      set((state) => {
        const target = state.panes[paneId];
        if (!target || target.type !== "leaf") return;

        const parentId = target.parentId;
        const parent = parentId ? state.panes[parentId] : null;

        if (parent && parent.type === "split" && parent.direction === direction) {
          const newLeaf: PaneNodeLeaf = {
            id: newLeafId,
            type: "leaf",
            terminalId: newTerminalId,
            parentId: parent.id,
          };
          state.panes[newLeafId] = newLeaf;

          const targetIndex = parent.children.indexOf(target.id);
          const insertAt = targetIndex === -1 ? parent.children.length : targetIndex + 1;
          parent.children.splice(insertAt, 0, newLeafId);
          parent.sizes = equalSizes(parent.children.length);
          return;
        }

        const splitId = nanoid();
        const newLeaf: PaneNodeLeaf = {
          id: newLeafId,
          type: "leaf",
          terminalId: newTerminalId,
          parentId: splitId,
        };
        const newSplit: PaneNodeSplit = {
          id: splitId,
          type: "split",
          direction,
          children: [target.id, newLeafId],
          sizes: [0.5, 0.5],
          parentId: target.parentId,
        };

        target.parentId = splitId;
        state.panes[splitId] = newSplit;
        state.panes[newLeafId] = newLeaf;

        if (parent && parent.type === "split") {
          const idx = parent.children.indexOf(target.id);
          if (idx !== -1) parent.children[idx] = splitId;
        }
      });

      const prevRoot = paneId;
      const newRootCandidate = useLayoutStore.getState().panes[newLeafId];
      if (newRootCandidate) {
        const splitOwner = newRootCandidate.parentId;
        if (splitOwner) {
          const owningSplit = useLayoutStore.getState().panes[splitOwner];
          if (owningSplit && owningSplit.parentId === null) {
            const tabsState = useTabsStore.getState();
            const affected = tabsState.tabs.some((t) => t.rootPaneId === prevRoot);
            if (affected) {
              useTabsStore.setState((s) => {
                for (const tab of s.tabs) {
                  if (tab.rootPaneId === prevRoot) {
                    tab.rootPaneId = splitOwner;
                  }
                }
              });
            }
          }
        }
      }

      return newLeafId;
    },

    closePane: (paneId) =>
      set((state) => {
        const target = state.panes[paneId];
        if (!target || target.type !== "leaf") return;

        const parentId = target.parentId;
        if (!parentId) {
          return;
        }

        const parent = state.panes[parentId];
        if (!parent || parent.type !== "split") return;

        const idx = parent.children.indexOf(paneId);
        if (idx !== -1) {
          parent.children.splice(idx, 1);
          parent.sizes.splice(idx, 1);
        }

        delete state.panes[paneId];

        if (parent.children.length >= 2) {
          parent.sizes = normalizeSizes(parent.sizes);
          return;
        }

        if (parent.children.length === 1) {
          const survivorId = parent.children[0];
          const survivor = state.panes[survivorId];
          if (!survivor) return;

          const grandparentId = parent.parentId;
          survivor.parentId = grandparentId;

          if (grandparentId) {
            const grandparent = state.panes[grandparentId];
            if (grandparent && grandparent.type === "split") {
              const parentIndexInGrandparent = grandparent.children.indexOf(parent.id);
              if (parentIndexInGrandparent !== -1) {
                grandparent.children[parentIndexInGrandparent] = survivorId;
              }
            }
          } else {
            useTabsStore.setState((s) => {
              for (const tab of s.tabs) {
                if (tab.rootPaneId === parent.id) {
                  tab.rootPaneId = survivorId;
                }
                if (tab.activePaneId === parent.id) {
                  tab.activePaneId = survivorId;
                }
              }
            });
          }

          delete state.panes[parent.id];
        }
      }),

    resizeSplit: (splitId, sizes) =>
      set((state) => {
        const node = state.panes[splitId];
        if (!node || node.type !== "split") return;
        if (sizes.length !== node.children.length) return;
        node.sizes = normalizeSizes(sizes);
      }),
  })),
);
