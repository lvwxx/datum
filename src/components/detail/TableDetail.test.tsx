import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TableDetail } from "./TableDetail";

const detail = {
  columns: [
    { name: "id", dataType: "bigint", default: null, comment: null, notNull: true, isPk: true },
    { name: "email", dataType: "text", default: "'x@x.com'", comment: "邮箱", notNull: true, isPk: false },
  ],
  indexes: [
    { name: "users_pkey", columns: "id", isPrimary: true, isUnique: true },
    { name: "users_email_idx", columns: "email", isPrimary: false, isUnique: true },
  ],
};

test("renders column definitions and indexes", () => {
  render(<TableDetail detail={detail} table="users" />);
  expect(screen.getByText("users")).toBeInTheDocument();
  // 字段表头
  expect(screen.getByText("NotNull")).toBeInTheDocument();
  expect(screen.getByText("Comment")).toBeInTheDocument();
  // 列注释("email" 文本在列名与索引列均出现,故用唯一的注释断言)
  expect(screen.getByText("邮箱")).toBeInTheDocument();
  expect(screen.getAllByText("email").length).toBeGreaterThanOrEqual(1);
  // 索引区
  expect(screen.getByText("users_email_idx")).toBeInTheDocument();
  expect(screen.getByText("Unique")).toBeInTheDocument();
});
