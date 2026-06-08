import type { TableDetail } from "../api/pg";

const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
const splitCols = (cols: string) => cols.split(",").map((c) => c.trim()).filter(Boolean);

/** 由表详情合成 CREATE TABLE(含主键与索引)。非逐字还原,用于查看/复制。 */
export function buildCreateTable(table: string, detail: TableDetail): string {
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
export function buildInsert(table: string, detail: TableDetail): string {
  const cols = detail.columns.map((c) => q(c.name)).join(", ");
  const vals = detail.columns.map((c) => `<${c.name}>`).join(", ");
  return `INSERT INTO ${q(table)} (${cols})\nVALUES (${vals});`;
}
