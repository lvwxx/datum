import { test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConnectionForm } from "./ConnectionForm";

test("type dropdown switches kind (and its default port); env dropdown sets env; submit carries both", () => {
  const onSubmit = vi.fn();
  render(<ConnectionForm onSubmit={onSubmit} onCancel={() => {}} />);

  fireEvent.change(screen.getByLabelText("类型"), { target: { value: "mysql" } });
  expect((screen.getByLabelText("端口") as HTMLInputElement).value).toBe("3306");

  fireEvent.change(screen.getByLabelText("环境"), { target: { value: "prod" } });
  fireEvent.change(screen.getByLabelText("名称"), { target: { value: "prod-mysql" } });
  fireEvent.click(screen.getByRole("button", { name: "保存" }));

  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ name: "prod-mysql", kind: "mysql", env: "prod" }),
    expect.anything(),
  );
});

test("selecting SQLite reveals the file-path field and hides host", () => {
  render(<ConnectionForm onSubmit={() => {}} onCancel={() => {}} />);
  expect(screen.getByLabelText("主机")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("类型"), { target: { value: "sqlite" } });
  expect(screen.getByLabelText("文件路径")).toBeInTheDocument();
  expect(screen.queryByLabelText("主机")).toBeNull();
});
