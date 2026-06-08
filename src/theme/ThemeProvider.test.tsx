import { test, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./ThemeProvider";

beforeEach(() => localStorage.clear());

function Probe() {
  const { name, toggle } = useTheme();
  return <button onClick={toggle}>theme:{name}</button>;
}

test("defaults to light and applies accent var to root", () => {
  render(<ThemeProvider><Probe /></ThemeProvider>);
  expect(screen.getByText("theme:light")).toBeInTheDocument();
  expect(document.documentElement.style.getPropertyValue("--accent")).toBe("#FF9940");
});

test("toggle switches to mirage and updates the var", () => {
  render(<ThemeProvider><Probe /></ThemeProvider>);
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByText("theme:mirage")).toBeInTheDocument();
  expect(document.documentElement.style.getPropertyValue("--accent")).toBe("#FFCC66");
});
