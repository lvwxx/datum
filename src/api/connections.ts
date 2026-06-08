import { invoke } from "@tauri-apps/api/core";
import type { Connection } from "../types";

export const listConnections = () => invoke<Connection[]>("list_connections");

export const saveConnection = (conn: Connection, password?: string) =>
  invoke<Connection>("save_connection", { conn, password });

export const deleteConnection = (id: string) =>
  invoke<void>("delete_connection", { id });
