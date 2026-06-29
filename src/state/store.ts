import { create } from "zustand";
import type { Connection } from "../types";

interface AppStore {
  connections: Connection[];
  activeId: string | null;
  activeTable: string | null;
  /** 哪些连接当前展开(可多个同时展开) */
  expandedConns: Record<string, boolean>;
  /** 每个连接已加载的表/key 列表(懒加载缓存) */
  tablesByConn: Record<string, string[]>;
  /** 已成功连接过的连接(侧边栏状态点) */
  connectedIds: Record<string, boolean>;
  dirtyEdits: Record<string, import("../api/pg").CellEdit>;
  setConnections: (c: Connection[]) => void;
  activate: (id: string) => void;
  setExpanded: (id: string, expanded: boolean) => void;
  /** 写入某连接的表列表,并标记其为已连接 */
  setTables: (id: string, tables: string[]) => void;
  /** 删除连接时清理其展开/表缓存/连接状态 */
  removeConnState: (id: string) => void;
  selectTable: (t: string | null) => void;
  stageEdit: (e: import("../api/pg").CellEdit) => void;
  clearEdits: () => void;
}

const omit = <T extends Record<string, unknown>>(obj: T, key: string): T => {
  if (!(key in obj)) return obj;
  const { [key]: _, ...rest } = obj;
  return rest as T;
};

export const useStore = create<AppStore>((set) => ({
  connections: [],
  activeId: null,
  activeTable: null,
  expandedConns: {},
  tablesByConn: {},
  connectedIds: {},
  dirtyEdits: {},
  setConnections: (connections) => set({ connections }),
  activate: (activeId) => set({ activeId, activeTable: null }),
  setExpanded: (id, expanded) =>
    set((s) => ({ expandedConns: { ...s.expandedConns, [id]: expanded } })),
  setTables: (id, tables) =>
    set((s) => ({
      tablesByConn: { ...s.tablesByConn, [id]: tables },
      connectedIds: { ...s.connectedIds, [id]: true },
    })),
  removeConnState: (id) =>
    set((s) => ({
      expandedConns: omit(s.expandedConns, id),
      tablesByConn: omit(s.tablesByConn, id),
      connectedIds: omit(s.connectedIds, id),
    })),
  selectTable: (activeTable) => set({ activeTable }),
  stageEdit: (e) => set((s) => ({
    dirtyEdits: { ...s.dirtyEdits, [`${e.pkValue}|${e.column}`]: e },
  })),
  clearEdits: () => set({ dirtyEdits: {} }),
}));
