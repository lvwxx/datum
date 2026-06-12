import { invoke } from "@tauri-apps/api/core";
import type { QueryResult, TableDetail, CellEdit } from "./pg";

// SQLite 复用 PG 侧的结果/详情/编辑类型(后端结构完全一致)。
export type { QueryResult, TableDetail, CellEdit } from "./pg";

export const sqliteConnect = (id: string) => invoke<void>("sqlite_connect", { id });
export const sqliteListObjects = (id: string) => invoke<string[]>("sqlite_list_objects", { id });
export const sqliteQuery = (id: string, sql: string) =>
  invoke<QueryResult>("sqlite_query", { id, sql });
export const sqliteTableDetail = (id: string, table: string) =>
  invoke<TableDetail>("sqlite_table_detail", { id, table });
export const sqliteCommitEdits = (id: string, edits: CellEdit[]) =>
  invoke<number>("sqlite_commit_edits", { id, edits });
