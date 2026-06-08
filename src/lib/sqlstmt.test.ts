import { test, expect } from "vitest";
import { currentStatement, splitStatements } from "./sqlstmt";

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
