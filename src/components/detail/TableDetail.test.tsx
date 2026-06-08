import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TableDetail } from "./TableDetail";

test("renders columns with pk marker", () => {
  render(<TableDetail detail={{ columns: [
    { name: "id", dataType: "bigint", isPk: true },
    { name: "name", dataType: "text", isPk: false },
  ] }} table="users" />);
  expect(screen.getByText("users")).toBeInTheDocument();
  expect(screen.getByText(/PK/)).toBeInTheDocument();
  expect(screen.getByText("name")).toBeInTheDocument();
});
