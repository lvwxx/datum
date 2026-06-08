import { test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SqlEditor } from "./SqlEditor";

test("renders run button and fires onRun", () => {
  const onRun = vi.fn();
  render(<SqlEditor value="SELECT 1" onChange={() => {}} onRun={onRun} />);
  fireEvent.click(screen.getByText(/运行/));
  expect(onRun).toHaveBeenCalled();
});
