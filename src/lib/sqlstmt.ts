/** 把 SQL 文本按顶层 `;` 切分为语句范围,忽略单引号字符串与 -- 行注释里的分号。 */
export function splitStatements(doc: string): { from: number; to: number }[] {
  const ranges: { from: number; to: number }[] = [];
  let start = 0;
  let i = 0;
  let inStr = false;
  while (i < doc.length) {
    const ch = doc[i];
    if (inStr) {
      if (ch === "'") {
        if (doc[i + 1] === "'") { i += 2; continue; } // 转义的 ''
        inStr = false;
      }
      i++;
      continue;
    }
    if (ch === "'") { inStr = true; i++; continue; }
    if (ch === "-" && doc[i + 1] === "-") { // 行注释直到换行
      while (i < doc.length && doc[i] !== "\n") i++;
      continue;
    }
    if (ch === ";") { ranges.push({ from: start, to: i }); i++; start = i; continue; }
    i++;
  }
  if (start < doc.length) ranges.push({ from: start, to: doc.length });
  return ranges;
}

/** 判断语句是否为"查询"(产生结果集),据此区分 SELECT 与 DDL/DML。 */
export function isQuery(sql: string): boolean {
  return /^\s*(?:with|select|show|explain|desc|describe|values|table|pragma)\b/i.test(sql);
}

/** 返回光标所在的那条语句(已 trim)。单条时即整段。 */
export function currentStatement(doc: string, caret: number): string {
  const ranges = splitStatements(doc);
  for (const r of ranges) {
    if (caret <= r.to) return doc.slice(r.from, r.to).trim();
  }
  const last = ranges[ranges.length - 1];
  return last ? doc.slice(last.from, last.to).trim() : doc.trim();
}
