import { create } from "zustand";
import type { Connection } from "../types";

interface AppStore {
  connections: Connection[];
  activeId: string | null;
  activeTable: string | null;
  dirtyEdits: Record<string, import("../api/pg").CellEdit>;
  setConnections: (c: Connection[]) => void;
  activate: (id: string) => void;
  selectTable: (t: string | null) => void;
  stageEdit: (e: import("../api/pg").CellEdit) => void;
  clearEdits: () => void;
}

export const useStore = create<AppStore>((set) => ({
  connections: [],
  activeId: null,
  activeTable: null,
  dirtyEdits: {},
  setConnections: (connections) => set({ connections }),
  activate: (activeId) => set({ activeId, activeTable: null }),
  selectTable: (activeTable) => set({ activeTable }),
  stageEdit: (e) => set((s) => ({
    dirtyEdits: { ...s.dirtyEdits, [`${e.pkValue}|${e.column}`]: e },
  })),
  clearEdits: () => set({ dirtyEdits: {} }),
}));
