import { invoke } from "@tauri-apps/api/core";

export interface QueryResult {
  columns: string[];
  rows: (string | null)[][];
  affected: number | null;
}
export interface ColumnInfo { name: string; dataType: string; isPk: boolean; }
export interface TableDetail { columns: ColumnInfo[]; }
export interface CellEdit {
  table: string; pkCol: string; pkValue: string; column: string; newValue: string;
}

export const pgConnect = (id: string) => invoke<void>("pg_connect", { id });
export const pgListObjects = (id: string) => invoke<string[]>("pg_list_objects", { id });
export const pgQuery = (id: string, sql: string) => invoke<QueryResult>("pg_query", { id, sql });
export const pgTableDetail = (id: string, table: string) =>
  invoke<TableDetail>("pg_table_detail", { id, table });
export const pgCommitEdits = (id: string, edits: CellEdit[]) =>
  invoke<number>("pg_commit_edits", { id, edits });
