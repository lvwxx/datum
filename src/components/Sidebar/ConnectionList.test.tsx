import { test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConnectionList } from "./ConnectionList";
import type { Connection } from "../../types";
import type { ConnView } from "../../lib/sidebarSearch";

const conn: Connection = { id: "c1", name: "prod-pg", kind: "pg", env: "prod", host: "h", port: 5432, user: "u", database: "d" };
const view = (expanded = false, tables: string[] = []): ConnView => ({ conn, expanded, tables });

test("renders connection name, env badge and connected status dot", () => {
  render(<ConnectionList views={[view()]} activeId={null} connectedIds={{ c1: true }} onToggle={() => {}} />);
  expect(screen.getByText("prod-pg")).toBeInTheDocument();
  expect(screen.getByText("PROD")).toBeInTheDocument();
  expect(screen.getByTitle("已连接")).toBeInTheDocument();
});

test("shows not-connected dot when connection is not connected", () => {
  render(<ConnectionList views={[view()]} activeId={null} connectedIds={{}} onToggle={() => {}} />);
  expect(screen.getByTitle("未连接")).toBeInTheDocument();
});

test("clicking the row fires onToggle and there is no inline edit button", () => {
  const onToggle = vi.fn();
  render(<ConnectionList views={[view()]} activeId={null} connectedIds={{}} onToggle={onToggle} />);
  expect(screen.queryByLabelText("编辑 prod-pg")).toBeNull();
  fireEvent.click(screen.getByText("prod-pg"));
  expect(onToggle).toHaveBeenCalledWith("c1");
});

test("renders children under an expanded connection only", () => {
  const { rerender } = render(
    <ConnectionList views={[view(false)]} activeId={null} connectedIds={{}} onToggle={() => {}}
      renderUnder={() => <div>UNDER</div>} />,
  );
  expect(screen.queryByText("UNDER")).toBeNull();
  rerender(
    <ConnectionList views={[view(true)]} activeId={null} connectedIds={{}} onToggle={() => {}}
      renderUnder={() => <div>UNDER</div>} />,
  );
  expect(screen.getByText("UNDER")).toBeInTheDocument();
});
