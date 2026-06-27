import { test, expect } from "vitest";
import { THEMES } from "./tokens";

test("both themes expose the same token keys", () => {
  const light = Object.keys(THEMES.light).sort();
  const dark = Object.keys(THEMES.dark).sort();
  expect(light).toEqual(dark);
});

test("Datum accent is the signature green in both themes", () => {
  expect(THEMES.light["--accent"].toLowerCase()).toBe("#1db954");
  expect(THEMES.dark["--accent"].toLowerCase()).toBe("#1db954");
});
