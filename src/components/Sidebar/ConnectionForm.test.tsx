import { test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConnectionForm } from "./ConnectionForm";

test("type dropdown switches kind (and default port); env segment sets env; submit carries both", () => {
  const onSubmit = vi.fn();
  render(<ConnectionForm onSubmit={onSubmit} onCancel={() => {}} />);

  fireEvent.change(screen.getByLabelText("类型"), { target: { value: "mysql" } });
  expect((screen.getByLabelText("端口") as HTMLInputElement).value).toBe("3306");

  fireEvent.click(screen.getByRole("button", { name: "PROD" }));
  fireEvent.change(screen.getByLabelText("名称"), { target: { value: "prod-mysql" } });
  fireEvent.click(screen.getByRole("button", { name: "保存连接" }));

  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ name: "prod-mysql", kind: "mysql", env: "prod" }),
    expect.anything(),
  );
});

test("password eye toggles the field between hidden and visible", () => {
  render(<ConnectionForm onSubmit={() => {}} onCancel={() => {}} />);
  const pw = screen.getByLabelText("密码") as HTMLInputElement;
  expect(pw.type).toBe("password");
  fireEvent.click(screen.getByRole("button", { name: "显示密码" }));
  expect(pw.type).toBe("text");
  fireEvent.click(screen.getByRole("button", { name: "隐藏密码" }));
  expect(pw.type).toBe("password");
});

test("test connection: resolves -> success state with elapsed message", async () => {
  render(<ConnectionForm onSubmit={() => {}} onCancel={() => {}} onTest={() => Promise.resolve()} />);
  fireEvent.click(screen.getByRole("button", { name: /测试连接/ }));
  expect(await screen.findByText("连接成功")).toBeInTheDocument();
  expect(await screen.findByText(/连接正常 · 用时/)).toBeInTheDocument();
});

test("test connection: rejects -> error state showing the real message", async () => {
  render(<ConnectionForm onSubmit={() => {}} onCancel={() => {}}
    onTest={() => Promise.reject({ message: "连接 PostgreSQL 失败", detail: "connection refused" })} />);
  fireEvent.click(screen.getByRole("button", { name: /测试连接/ }));
  expect(await screen.findByText("连接失败")).toBeInTheDocument();
  expect(await screen.findByText(/connection refused/)).toBeInTheDocument();
});

test("selecting SQLite reveals the file-path field and hides host", () => {
  render(<ConnectionForm onSubmit={() => {}} onCancel={() => {}} />);
  expect(screen.getByLabelText("主机")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("类型"), { target: { value: "sqlite" } });
  expect(screen.getByLabelText("文件路径")).toBeInTheDocument();
  expect(screen.queryByLabelText("主机")).toBeNull();
});
