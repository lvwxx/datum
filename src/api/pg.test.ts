import { test, expect, vi, beforeEach } from "vitest";
const invoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...a: unknown[]) => invoke(...a) }));
import { pgQuery, pgCommitEdits } from "./pg";
beforeEach(() => invoke.mockReset());

test("pgQuery passes id and sql", async () => {
  invoke.mockResolvedValue({ columns: [], rows: [], affected: null });
  await pgQuery("c1", "SELECT 1");
  expect(invoke).toHaveBeenCalledWith("pg_query", { id: "c1", sql: "SELECT 1" });
});

test("pgCommitEdits passes edits array", async () => {
  invoke.mockResolvedValue(1);
  const edits = [{ table: "users", pkCol: "id", pkValue: "2", column: "name", newValue: "X" }];
  await pgCommitEdits("c1", edits);
  expect(invoke).toHaveBeenCalledWith("pg_commit_edits", { id: "c1", edits });
});
