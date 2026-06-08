import { EditorState } from "@codemirror/state";

const KEYWORDS = new Set([
  "select", "from", "where", "insert", "into", "values", "update", "set", "delete",
  "join", "left", "right", "inner", "outer", "full", "cross", "on", "using",
  "group", "by", "order", "having", "limit", "offset", "fetch",
  "and", "or", "not", "null", "as", "distinct", "all", "any", "some",
  "create", "table", "alter", "drop", "truncate", "view", "index", "unique",
  "primary", "key", "foreign", "references", "constraint", "default", "check",
  "like", "ilike", "in", "between", "is", "exists", "union", "intersect", "except",
  "asc", "desc", "case", "when", "then", "else", "end",
  "with", "returning", "cast", "coalesce", "nulls", "first", "last",
]);

const BOUNDARY = /[\s,;()]/;

/** 输入边界字符时,把紧邻前面的 SQL 关键字自动转为大写(长度不变,光标不跳)。 */
export const upperKeywords = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged) return tr;
  const extra: { from: number; to: number; insert: string }[] = [];
  tr.changes.iterChanges((_fromA, _toA, _fromB, toB, inserted) => {
    const ins = inserted.toString();
    if (ins.length !== 1 || !BOUNDARY.test(ins)) return;
    const doc = tr.newDoc;
    const pos = toB - 1; // 边界字符所在位置
    let start = pos;
    while (start > 0 && /\w/.test(doc.sliceString(start - 1, start))) start--;
    const word = doc.sliceString(start, pos);
    if (word && KEYWORDS.has(word.toLowerCase()) && word !== word.toUpperCase()) {
      extra.push({ from: start, to: pos, insert: word.toUpperCase() });
    }
  });
  return extra.length ? [tr, { changes: extra, sequential: true }] : tr;
});
