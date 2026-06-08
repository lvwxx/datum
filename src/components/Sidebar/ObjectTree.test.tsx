import { test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ObjectTree } from "./ObjectTree";

test("renders tables and fires onSelect", () => {
  const onSelect = vi.fn();
  render(<ObjectTree tables={["users", "orders"]} active={null} onSelect={onSelect} />);
  expect(screen.getByText("users")).toBeInTheDocument();
  fireEvent.click(screen.getByText("orders"));
  expect(onSelect).toHaveBeenCalledWith("orders");
});
