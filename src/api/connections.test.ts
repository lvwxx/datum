import { test, expect, vi, beforeEach } from "vitest";

const invoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...a: unknown[]) => invoke(...a) }));

import { listConnections, saveConnection, deleteConnection } from "./connections";

beforeEach(() => invoke.mockReset());

test("listConnections calls list_connections", async () => {
  invoke.mockResolvedValue([]);
  await listConnections();
  expect(invoke).toHaveBeenCalledWith("list_connections");
});

test("saveConnection passes conn and password", async () => {
  invoke.mockResolvedValue({ id: "c1" });
  const conn = { id: "c1", name: "n", kind: "pg", env: "prod", host: "h",
    port: 5432, user: "u", database: "d" } as const;
  await saveConnection(conn, "secret");
  expect(invoke).toHaveBeenCalledWith("save_connection", { conn, password: "secret" });
});

test("deleteConnection passes id", async () => {
  invoke.mockResolvedValue(undefined);
  await deleteConnection("c1");
  expect(invoke).toHaveBeenCalledWith("delete_connection", { id: "c1" });
});
