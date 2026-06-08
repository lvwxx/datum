import { test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConnectionList } from "./ConnectionList";
import type { Connection } from "../../types";

const conns: Connection[] = [
  { id: "c1", name: "prod-pg", kind: "pg", env: "prod", host: "h", port: 5432, user: "u", database: "d" },
];

test("renders connection name and env badge", () => {
  render(<ConnectionList connections={conns} activeId={null} onPick={() => {}} onEdit={() => {}} />);
  expect(screen.getByText("prod-pg")).toBeInTheDocument();
  expect(screen.getByText("PROD")).toBeInTheDocument();
});

test("edit button fires onEdit and does not fire onPick", () => {
  const onEdit = vi.fn();
  const onPick = vi.fn();
  render(<ConnectionList connections={conns} activeId={null} onPick={onPick} onEdit={onEdit} />);
  fireEvent.click(screen.getByLabelText("编辑 prod-pg"));
  expect(onEdit).toHaveBeenCalledWith(conns[0]);
  expect(onPick).not.toHaveBeenCalled();
});
