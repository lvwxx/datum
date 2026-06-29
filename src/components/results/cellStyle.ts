export type Align = "left" | "right" | "center";

/** 按类型推断列对齐(表头与单元格共用)。 */
export function colAlign(type: string | undefined): Align {
  const t = (type ?? "").toLowerCase();
  if (/bool/.test(t)) return "center";
  if (/int|serial|numeric|decimal|real|double|float|money/.test(t)) return "right";
  return "left";
}

export interface CellStyle {
  /** 文本色(Datum 灰阶分级 token) */
  color: string;
  /** 是否等宽字体 */
  mono: boolean;
  /** 不透明哈希块(uuid/bytea):渲染时加字距 */
  hash?: boolean;
}

/**
 * 按类型/值给单元格分级上色(Datum 灰阶三档 + 单一语义色)。
 * 档位:tier1 主值(text)`--cell-strong` / 软值(enum、bool-true、默认)`--cell`;
 * tier2 次级(int、timestamp)`--cell-dim`;tier3 哈希块(uuid/bytea)`--cell-hash`;
 * 凹陷(null、0001- 空时间戳)`--cell-null`;唯一语义色 bool-false `--negative`。
 */
export function classifyCell(value: string | null, type: string | undefined): CellStyle {
  if (value == null) return { color: "var(--cell-null)", mono: true };
  const t = (type ?? "").toLowerCase();
  if (/bool/.test(t) || value === "true" || value === "false") {
    const truthy = value === "true" || value === "t";
    return { color: truthy ? "var(--cell)" : "var(--negative)", mono: true };
  }
  if (/int|serial|numeric|decimal|real|double|float|money/.test(t) || /^-?\d+(\.\d+)?$/.test(value)) {
    return { color: "var(--cell-dim)", mono: true };
  }
  if (/time|date/.test(t)) {
    const empty = value.startsWith("0001-");
    return { color: empty ? "var(--cell-null)" : "var(--cell-dim)", mono: true };
  }
  if (/uuid|bytea/.test(t)) return { color: "var(--cell-hash)", mono: true, hash: true };
  if (/char|text|citext|name/.test(t)) return { color: "var(--cell-strong)", mono: false };
  return { color: "var(--cell)", mono: false };
}
