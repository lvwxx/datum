import { test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResultGrid } from "./ResultGrid";

const result = { columns: ["id", "name"], rows: [["1", "Alice"], ["2", "Bob"]], affected: null };

test("double click opens cell modal and stages on apply", () => {
  const onStage = vi.fn();
  render(<ResultGrid result={result} pkCol="id" dirtyKeys={new Set()} onStage={onStage} onCommit={() => {}} />);
  fireEvent.doubleClick(screen.getByText("Bob"));
  const ta = screen.getByDisplayValue("Bob");
  fireEvent.change(ta, { target: { value: "Bobby" } });
  fireEvent.click(screen.getByText("暂存修改"));
  expect(onStage).toHaveBeenCalledWith(
    expect.objectContaining({ pkValue: "2", column: "name", newValue: "Bobby" })
  );
});

test("clicking a row fires onSelectRow", () => {
  const onSelectRow = vi.fn();
  render(<ResultGrid result={result} pkCol="id" dirtyKeys={new Set()} selectedRow={null}
                     onSelectRow={onSelectRow} onStage={() => {}} onCommit={() => {}} />);
  fireEvent.click(screen.getByText("Bob").closest("tr")!);
  expect(onSelectRow).toHaveBeenCalledWith(1);
});

test("selected row is highlighted", () => {
  render(<ResultGrid result={result} pkCol="id" dirtyKeys={new Set()} selectedRow={1}
                     onSelectRow={() => {}} onStage={() => {}} onCommit={() => {}} />);
  const td = screen.getByText("Bob").closest("td")!;
  expect(td.style.background).toContain("--selection");
});

test("shows pk warning when pkCol is null", () => {
  render(<ResultGrid result={result} pkCol={null} dirtyKeys={new Set()} onStage={() => {}} onCommit={() => {}} />);
  expect(screen.getByText(/无主键/)).toBeInTheDocument();
});
