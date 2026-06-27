import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

/**
 * Datum 的 CodeMirror 主题。颜色全部走 CSS 变量,
 * 因此暗/亮主题自动跟随 :root 上的 token,无需两套主题。
 * `dark` 仅用于 CM 内置控件(选区/光标)的明暗判定。
 */
const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.modifier, t.operatorKeyword], color: "var(--syn-keyword)", fontWeight: "600" },
  { tag: [t.string, t.special(t.string)], color: "var(--syn-string)" },
  { tag: [t.number, t.bool, t.null], color: "var(--syn-number)" },
  { tag: [t.typeName, t.typeOperator], color: "var(--syn-type)" },
  { tag: [t.propertyName, t.name, t.variableName], color: "var(--syn-entity)" },
  { tag: [t.operator, t.punctuation, t.separator, t.bracket], color: "var(--syn-operator)" },
  { tag: [t.comment, t.lineComment, t.blockComment], color: "var(--fg-faint)", fontStyle: "italic" },
]);

export function datumTheme(dark: boolean): Extension {
  const base = EditorView.theme(
    {
      "&": { backgroundColor: "var(--editor-bg)", color: "var(--fg-soft)" },
      ".cm-content": {
        fontFamily: 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: "14px", caretColor: "var(--fg)",
      },
      ".cm-gutters": {
        backgroundColor: "var(--editor-bg)", color: "var(--fg-faint)",
        border: "none", borderRight: "1px solid var(--border)",
      },
      ".cm-activeLine": { backgroundColor: "transparent" },
      ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--fg-muted)" },
      ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--fg)" },
      "&.cm-focused": { outline: "none" },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
        backgroundColor: "var(--selection)",
      },
      ".cm-selectionMatch": { backgroundColor: "var(--selection)" },
    },
    { dark },
  );
  return [base, syntaxHighlighting(highlight)];
}
