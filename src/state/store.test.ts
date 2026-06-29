import { test, expect, beforeEach } from "vitest";
import { useStore } from "./store";

beforeEach(() => useStore.setState({
  connections: [], activeId: null, activeTable: null, dirtyEdits: {},
  expandedConns: {}, tablesByConn: {}, connectedIds: {},
}));

test("setConnections and activate", () => {
  const c = { id: "c1", name: "n", kind: "pg", env: "local", host: "h",
    port: 5432, user: "u", database: "d" } as const;
  useStore.getState().setConnections([c]);
  useStore.getState().activate("c1");
  expect(useStore.getState().connections).toHaveLength(1);
  expect(useStore.getState().activeId).toBe("c1");
});

test("selectTable sets activeTable", () => {
  useStore.getState().selectTable("users");
  expect(useStore.getState().activeTable).toBe("users");
});

test("setExpanded toggles a connection's expanded flag", () => {
  useStore.getState().setExpanded("c1", true);
  expect(useStore.getState().expandedConns).toEqual({ c1: true });
  useStore.getState().setExpanded("c1", false);
  expect(useStore.getState().expandedConns).toEqual({ c1: false });
});

test("setTables stores tables and marks the connection connected", () => {
  useStore.getState().setTables("c1", ["users", "orders"]);
  expect(useStore.getState().tablesByConn.c1).toEqual(["users", "orders"]);
  expect(useStore.getState().connectedIds.c1).toBe(true);
});

test("removeConnState clears expanded/tables/connected for one connection", () => {
  const s = useStore.getState();
  s.setExpanded("c1", true); s.setTables("c1", ["t"]);
  s.setExpanded("c2", true); s.setTables("c2", ["u"]);
  useStore.getState().removeConnState("c1");
  const st = useStore.getState();
  expect(st.expandedConns.c1).toBeUndefined();
  expect(st.tablesByConn.c1).toBeUndefined();
  expect(st.connectedIds.c1).toBeUndefined();
  // c2 untouched
  expect(st.tablesByConn.c2).toEqual(["u"]);
});

test("stageEdit accumulates and clearEdits resets", () => {
  const e = { table: "users", pkCol: "id", pkValue: "2", column: "name", newValue: "X" };
  useStore.getState().stageEdit(e);
  expect(Object.keys(useStore.getState().dirtyEdits)).toHaveLength(1);
  useStore.getState().clearEdits();
  expect(useStore.getState().dirtyEdits).toEqual({});
});
