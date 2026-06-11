import { test, expect } from "vitest";
import { currentStatement, isQuery, splitStatements } from "./sqlstmt";

test("single statement returns whole text", () => {
  expect(currentStatement("select 1", 3)).toBe("select 1");
});

test("picks the statement at caret among multiple", () => {
  const doc = "select 1;\nselect 2";
  expect(currentStatement(doc, 3)).toBe("select 1");
  expect(currentStatement(doc, 12)).toBe("select 2");
});

test("semicolon inside string does not split", () => {
  expect(splitStatements("select ';'")).toHaveLength(1);
  expect(currentStatement("select ';'", 4)).toBe("select ';'");
});

test("ignores semicolon in line comment", () => {
  expect(splitStatements("select 1 -- a; b\n")).toHaveLength(1);
});

test("isQuery distinguishes SELECT-like from DDL/DML", () => {
  expect(isQuery("  SELECT * FROM t")).toBe(true);
  expect(isQuery("with x as (...) select 1")).toBe(true);
  expect(isQuery("SHOW TABLES")).toBe(true);
  expect(isQuery("INSERT INTO t VALUES (1)")).toBe(false);
  expect(isQuery("create table t(id int)")).toBe(false);
  expect(isQuery("UPDATE t SET a=1")).toBe(false);
});
