import { test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResultGrid } from "./ResultGrid";

const result = { columns: ["id", "name"], rows: [["1", "Alice"], ["2", "Bob"]], affected: null };

test("double click cell edits and stages on change", () => {
  const onStage = vi.fn();
  render(<ResultGrid result={result} pkCol="id" dirtyKeys={new Set()} onStage={onStage} onCommit={() => {}} />);
  fireEvent.doubleClick(screen.getByText("Bob"));
  const input = screen.getByDisplayValue("Bob");
  fireEvent.change(input, { target: { value: "Bobby" } });
  fireEvent.blur(input);
  expect(onStage).toHaveBeenCalledWith(
    expect.objectContaining({ pkValue: "2", column: "name", newValue: "Bobby" })
  );
});

test("shows pk warning when pkCol is null", () => {
  render(<ResultGrid result={result} pkCol={null} dirtyKeys={new Set()} onStage={() => {}} onCommit={() => {}} />);
  expect(screen.getByText(/无主键/)).toBeInTheDocument();
});
