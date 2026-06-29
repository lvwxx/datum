import { test, expect } from "vitest";
import { filterConnections } from "./sidebarSearch";
import type { Connection } from "../types";

const mk = (id: string, name: string): Connection => ({
  id, name, kind: "pg", env: "local", host: "h", port: 5432, user: "u", database: "d",
});

const conns: Connection[] = [mk("c1", "Babbage"), mk("c2", "Lovelace")];
const tablesByConn = {
  c1: ["admin_members", "agents", "global_providers"],
  // c2 not loaded
};

test("empty query: all visible, expanded reflects expandedConns, tables from cache", () => {
  const v = filterConnections(conns, tablesByConn, { c1: true }, "");
  expect(v.map((x) => x.conn.id)).toEqual(["c1", "c2"]);
  expect(v[0]).toMatchObject({ expanded: true, tables: ["admin_members", "agents", "global_providers"] });
  expect(v[1]).toMatchObject({ expanded: false, tables: [] });
});

test("query matches connection name: only that connection visible, tables not filtered", () => {
  const v = filterConnections(conns, tablesByConn, { c1: true }, "babb");
  expect(v.map((x) => x.conn.id)).toEqual(["c1"]);
  // name match shows all loaded tables, keeps user expand state (not forced)
  expect(v[0].tables).toEqual(["admin_members", "agents", "global_providers"]);
  expect(v[0].expanded).toBe(true);
});

test("query matches a table in a loaded connection: connection visible, force-expanded, only matching tables", () => {
  const v = filterConnections(conns, tablesByConn, {}, "agent");
  expect(v.map((x) => x.conn.id)).toEqual(["c1"]);
  expect(v[0].expanded).toBe(true);
  expect(v[0].tables).toEqual(["agents"]);
});

test("query matches nothing in an unloaded connection (no name match): hidden", () => {
  // c2 has no cached tables; searching a table term hides it
  const v = filterConnections(conns, tablesByConn, {}, "agent");
  expect(v.find((x) => x.conn.id === "c2")).toBeUndefined();
});

test("case-insensitive matching on both name and tables", () => {
  expect(filterConnections(conns, tablesByConn, {}, "LOVE").map((x) => x.conn.id)).toEqual(["c2"]);
  expect(filterConnections(conns, tablesByConn, {}, "GLOBAL")[0].tables).toEqual(["global_providers"]);
});

test("whitespace-only query treated as empty", () => {
  const v = filterConnections(conns, tablesByConn, {}, "   ");
  expect(v.map((x) => x.conn.id)).toEqual(["c1", "c2"]);
});
