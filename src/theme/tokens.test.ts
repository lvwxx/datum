import { test, expect } from "vitest";
import { THEMES } from "./tokens";

test("both themes expose the same token keys", () => {
  const light = Object.keys(THEMES.light).sort();
  const dark = Object.keys(THEMES.mirage).sort();
  expect(light).toEqual(dark);
});

test("ayu light accent is amber", () => {
  expect(THEMES.light["--accent"].toLowerCase()).toBe("#ff9940");
});
