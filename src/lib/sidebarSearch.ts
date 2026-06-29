import type { Connection } from "../types";

/** 侧边栏一个连接的可见性/展开/表渲染结果(经搜索过滤后)。 */
export interface ConnView {
  conn: Connection;
  /** 有效展开态:搜索命中表时强制展开 */
  expanded: boolean;
  /** 要渲染的表(搜索命中表时仅命中项) */
  tables: string[];
}

/**
 * 按查询过滤侧边栏树。返回应展示的连接(保持原顺序)。
 * - 查询为空:全部展示,展开态取 expandedConns,表取缓存。
 * - 连接名命中:展示该连接,不过滤其表,沿用用户展开态。
 * - (仅在已加载表的连接里)表名命中:展示并强制展开,仅渲染命中表。
 * - 都不命中:隐藏。
 */
export function filterConnections(
  connections: Connection[],
  tablesByConn: Record<string, string[]>,
  expandedConns: Record<string, boolean>,
  query: string,
): ConnView[] {
  const q = query.trim().toLowerCase();
  const out: ConnView[] = [];
  for (const conn of connections) {
    const tables = tablesByConn[conn.id] ?? [];
    if (!q) {
      out.push({ conn, expanded: !!expandedConns[conn.id], tables });
      continue;
    }
    if (conn.name.toLowerCase().includes(q)) {
      out.push({ conn, expanded: !!expandedConns[conn.id], tables });
      continue;
    }
    const matched = tables.filter((t) => t.toLowerCase().includes(q));
    if (matched.length > 0) {
      out.push({ conn, expanded: true, tables: matched });
    }
  }
  return out;
}
