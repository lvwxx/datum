import { create } from "zustand";
import type { Connection } from "../types";

interface AppStore {
  connections: Connection[];
  activeId: string | null;
  activeTable: string | null;
  setConnections: (c: Connection[]) => void;
  activate: (id: string) => void;
  selectTable: (t: string | null) => void;
}

export const useStore = create<AppStore>((set) => ({
  connections: [],
  activeId: null,
  activeTable: null,
  setConnections: (connections) => set({ connections }),
  activate: (activeId) => set({ activeId, activeTable: null }),
  selectTable: (activeTable) => set({ activeTable }),
}));
