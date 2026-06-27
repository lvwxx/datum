import { test, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./ThemeProvider";

beforeEach(() => localStorage.clear());

function Probe() {
  const { name, toggle } = useTheme();
  return <button onClick={toggle}>theme:{name}</button>;
}

test("defaults to dark and applies the green accent var to root", () => {
  render(<ThemeProvider><Probe /></ThemeProvider>);
  expect(screen.getByText("theme:dark")).toBeInTheDocument();
  expect(document.documentElement.style.getPropertyValue("--accent")).toBe("#1db954");
});

test("toggle switches to light and keeps the green accent", () => {
  render(<ThemeProvider><Probe /></ThemeProvider>);
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByText("theme:light")).toBeInTheDocument();
  expect(document.documentElement.style.getPropertyValue("--accent")).toBe("#1db954");
});
