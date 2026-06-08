import { test, expect } from "vitest";
import { render } from "@testing-library/react";
import { SqlEditor } from "./SqlEditor";

test("renders the CodeMirror SQL editor", () => {
  const { container } = render(<SqlEditor value="SELECT 1" onChange={() => {}} onRun={() => {}} />);
  expect(container.querySelector(".cm-editor")).toBeTruthy();
});
