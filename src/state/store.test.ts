import { test, expect, beforeEach } from "vitest";
import { useStore } from "./store";

beforeEach(() => useStore.setState({ connections: [], activeId: null, activeTable: null }));

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
