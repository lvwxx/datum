import { invoke } from "@tauri-apps/api/core";
import type { Connection } from "../types";

export const listConnections = () => invoke<Connection[]>("list_connections");

export const saveConnection = (conn: Connection, password?: string) =>
  invoke<Connection>("save_connection", { conn, password });

export const deleteConnection = (id: string) =>
  invoke<void>("delete_connection", { id });

/** 用表单当前参数做一次真实连通性测试(不保存)。失败时 reject 一个 AppError。 */
export const testConnection = (p: {
  kind: string; host: string; port: number; user: string;
  password: string; database: string; filePath?: string | null;
}) => invoke<void>("test_connection", p);
