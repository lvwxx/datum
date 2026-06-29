import { test, expect } from "vitest";
import { classifyCell, colAlign } from "./cellStyle";

test("colAlign: bools center, numbers right, others left", () => {
  expect(colAlign("boolean")).toBe("center");
  expect(colAlign("int8")).toBe("right");
  expect(colAlign("numeric")).toBe("right");
  expect(colAlign("text")).toBe("left");
  expect(colAlign(undefined)).toBe("left");
});

test("null is recessed and mono", () => {
  expect(classifyCell(null, "text")).toEqual({ color: "var(--cell-null)", mono: true });
});

test("bool true is soft, false is negative", () => {
  expect(classifyCell("true", "bool").color).toBe("var(--cell)");
  expect(classifyCell("false", "bool").color).toBe("var(--negative)");
});

test("integers/numerics use the dim tier (tier 2), mono", () => {
  expect(classifyCell("42", "int8")).toEqual({ color: "var(--cell-dim)", mono: true });
  // bare numeric value with no type info still reads as a number
  expect(classifyCell("3.14", undefined).color).toBe("var(--cell-dim)");
});

test("timestamps use the dim tier; the 0001- sentinel is recessed", () => {
  expect(classifyCell("2026-04-01 10:22:31", "timestamptz").color).toBe("var(--cell-dim)");
  expect(classifyCell("0001-01-01 00:00:00", "timestamptz").color).toBe("var(--cell-null)");
});

test("uuid/bytea render as an opaque hash blob (tier 3) with letter spacing", () => {
  const c = classifyCell("5af0522b586690ee", "uuid");
  expect(c.color).toBe("var(--cell-hash)");
  expect(c.mono).toBe(true);
  expect(c.hash).toBe(true);
});

test("text/varchar are the primary bright value (tier 1), non-mono", () => {
  expect(classifyCell("azure_openai", "text")).toMatchObject({ color: "var(--cell-strong)", mono: false });
  expect(classifyCell("hello", "varchar").color).toBe("var(--cell-strong)");
});

test("unknown non-numeric values fall back to the soft default tier", () => {
  expect(classifyCell("{\"a\":1}", "jsonb")).toMatchObject({ color: "var(--cell)", mono: false });
});
