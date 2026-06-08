import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConnectionList } from "./ConnectionList";
import type { Connection } from "../../types";

const conns: Connection[] = [
  { id: "c1", name: "prod-pg", kind: "pg", env: "prod", host: "h", port: 5432, user: "u", database: "d" },
];

test("renders connection name and env badge", () => {
  render(<ConnectionList connections={conns} activeId={null} onPick={() => {}} />);
  expect(screen.getByText("prod-pg")).toBeInTheDocument();
  expect(screen.getByText("PROD")).toBeInTheDocument();
});
