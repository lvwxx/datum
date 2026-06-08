import { test, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import { upperKeywords } from "./upperKeywords";

/** 在 doc 的 at 处插入文本,返回经扩展处理后的新文档。 */
function typeAt(doc: string, insert: string, at: number): string {
  const state = EditorState.create({ doc, extensions: [upperKeywords] });
  return state.update({ changes: { from: at, insert } }).state.doc.toString();
}

test("typing a boundary after a keyword uppercases it", () => {
  expect(typeAt("select", " ", 6)).toBe("SELECT ");
  expect(typeAt("from", "(", 4)).toBe("FROM(");
});

test("partial word is not uppercased (no boundary yet)", () => {
  expect(typeAt("selec", "t", 5)).toBe("select"); // 'select' 仍在输入中,无边界
});

test("non-keyword is left untouched", () => {
  expect(typeAt("users", " ", 5)).toBe("users ");
});
