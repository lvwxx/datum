import { test, expect } from "vitest";
import { columnWidths } from "./columnFit";

const sum = (a: number[]) => a.reduce((s, w) => s + w, 0);

test("content narrower than container: stretches to fill exactly, never below content", () => {
  const auto = [64, 200];
  const out = columnWidths(auto, {}, 1000, 170);
  expect(sum(out)).toBe(1000);
  expect(out[0]).toBeGreaterThanOrEqual(64);
  expect(out[1]).toBeGreaterThanOrEqual(200);
});

test("content wider than container: keeps content widths (horizontal scroll, no shrink)", () => {
  const auto = [400, 400];
  expect(columnWidths(auto, {}, 500, 170)).toEqual([400, 400]);
});

test("containerW unknown (0): returns content widths untouched", () => {
  expect(columnWidths([64, 200], {}, 0, 170)).toEqual([64, 200]);
});

test("manual override stays fixed; remaining space fills the auto columns", () => {
  // col0 pinned to 300; col1 auto absorbs the rest of 1000
  const out = columnWidths([64, 200], { 0: 300 }, 1000, 170);
  expect(out[0]).toBe(300);
  expect(out[1]).toBe(700);
  expect(sum(out)).toBe(1000);
});

test("only flexible (text) columns absorb surplus; rigid columns stay at content", () => {
  // col0 rigid (e.g. id/number), col1 flexible (text)
  const out = columnWidths([64, 200], {}, 1000, 170, [false, true]);
  expect(out[0]).toBe(64);          // rigid stays compact
  expect(out[1]).toBe(936);         // text column eats the surplus
  expect(sum(out)).toBe(1000);
});

test("falls back to stretching all columns when none are flexible", () => {
  const out = columnWidths([64, 200], {}, 1000, 170, [false, false]);
  expect(sum(out)).toBe(1000);
  expect(out[0]).toBeGreaterThan(64);
  expect(out[1]).toBeGreaterThan(200);
});

test("single column: half the container width (EXPLAIN-style), not full fill", () => {
  expect(columnWidths([120], {}, 1000, 170)).toEqual([500]);
  // honours a wider default floor
  expect(columnWidths([120], {}, 200, 170)).toEqual([170]);
});
