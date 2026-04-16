import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { TerminalProcess } from "@/types";

export interface TerminalsState {
  terminals: Record<string, TerminalProcess>;
  addTerminal: (t: TerminalProcess) => void;
  updateTerminal: (id: string, patch: Partial<TerminalProcess>) => void;
  removeTerminal: (id: string) => void;
  getTerminal: (id: string) => TerminalProcess | undefined;
}

export const useTerminalsStore = create<TerminalsState>()(
  immer((set, get) => ({
    terminals: {},

    addTerminal: (t) =>
      set((state) => {
        state.terminals[t.id] = t;
      }),

    updateTerminal: (id, patch) =>
      set((state) => {
        const existing = state.terminals[id];
        if (!existing) return;
        state.terminals[id] = { ...existing, ...patch };
      }),

    removeTerminal: (id) =>
      set((state) => {
        delete state.terminals[id];
      }),

    getTerminal: (id) => get().terminals[id],
  })),
);
