import type { TableDetail } from "../api/pg";

export type Dialect = "pg" | "mysql";

/** 标识符引号:pg 用双引号,mysql 用反引号。 */
const ident = (s: string, d: Dialect = "pg") =>
  d === "mysql" ? `\`${s.replace(/`/g, "``")}\`` : `"${s.replace(/"/g, '""')}"`;

/** 字符串字面量:mysql 还需转义反斜杠(默认开启反斜杠转义)。 */
const lit = (v: string, d: Dialect = "pg") => {
  const e = d === "mysql" ? v.replace(/\\/g, "\\\\").replace(/'/g, "''") : v.replace(/'/g, "''");
  return `'${e}'`;
};

const splitCols = (cols: string) => cols.split(",").map((c) => c.trim()).filter(Boolean);

/** 由表详情合成 CREATE TABLE(仅 PG;MySQL 用 SHOW CREATE TABLE)。 */
export function buildCreateTable(table: string, detail: TableDetail): string {
  const q = (s: string) => ident(s, "pg");
  const lines = detail.columns.map((c) => {
    let line = `  ${q(c.name)} ${c.dataType}`;
    if (c.notNull) line += " NOT NULL";
    if (c.default != null && c.default !== "") line += ` DEFAULT ${c.default}`;
    return line;
  });

  const pk = detail.indexes.find((i) => i.isPrimary);
  if (pk) {
    const cols = splitCols(pk.columns).map(q).join(", ");
    lines.push(`  PRIMARY KEY (${cols})`);
  }

  let ddl = `CREATE TABLE ${q(table)} (\n${lines.join(",\n")}\n);`;

  for (const idx of detail.indexes.filter((i) => !i.isPrimary)) {
    const cols = splitCols(idx.columns).map(q).join(", ");
    ddl += `\n\nCREATE ${idx.isUnique ? "UNIQUE " : ""}INDEX ${q(idx.name)} ON ${q(table)} (${cols});`;
  }
  return ddl;
}

/** 由表详情合成 INSERT 模板,值用 <列名> 占位,便于替换。 */
export function buildInsert(table: string, detail: TableDetail, d: Dialect = "pg"): string {
  const cols = detail.columns.map((c) => ident(c.name, d)).join(", ");
  const vals = detail.columns.map((c) => `<${c.name}>`).join(", ");
  return `INSERT INTO ${ident(table, d)} (${cols})\nVALUES (${vals});`;
}

/** 由结果某一行的真实值合成 INSERT(NULL 原样,其余按方言转义)。 */
export function buildInsertRow(table: string, columns: string[], values: (string | null)[], d: Dialect = "pg"): string {
  const cols = columns.map((c) => ident(c, d)).join(", ");
  const vals = values.map((v) => (v == null ? "NULL" : lit(v, d))).join(", ");
  return `INSERT INTO ${ident(table, d)} (${cols}) VALUES (${vals});`;
}
