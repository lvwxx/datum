import { invoke } from "@tauri-apps/api/core";
import type { QueryResult, TableDetail, CellEdit } from "./pg";

export const myConnect = (id: string) => invoke<void>("my_connect", { id });
export const myListObjects = (id: string) => invoke<string[]>("my_list_objects", { id });
export const myQuery = (id: string, sql: string) => invoke<QueryResult>("my_query", { id, sql });
export const myTableDetail = (id: string, table: string) =>
  invoke<TableDetail>("my_table_detail", { id, table });
export const myCommitEdits = (id: string, edits: CellEdit[]) =>
  invoke<number>("my_commit_edits", { id, edits });
