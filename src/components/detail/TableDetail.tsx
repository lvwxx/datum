import type { TableDetail as Detail } from "../../api/pg";

const th: React.CSSProperties = {
  textAlign: "left", fontWeight: 600, color: "var(--fg-muted)",
  padding: "3px 6px", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
  position: "sticky", top: 0, background: "var(--bg-panel)",
};
const td: React.CSSProperties = {
  padding: "3px 6px", borderBottom: "1px solid var(--border)",
  whiteSpace: "nowrap", verticalAlign: "top",
};
const check = (on: boolean) => (on ? <span style={{ color: "var(--accent)" }}>✓</span> : "");
const dim = (v: string | null) =>
  v == null || v === "" ? <span style={{ color: "var(--fg-muted)" }}>—</span> : v;

export function TableDetail(props: {
  detail: Detail;
  table: string;
  onColContext?: (x: number, y: number) => void;
}) {
  const { columns, indexes } = props.detail;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontSize: 11 }}>
      <div style={{ padding: "6px 8px", color: "var(--fg-muted)", fontSize: 10, textTransform: "uppercase", flexShrink: 0, borderBottom: "1px solid var(--border)" }}>
        <span>表 · </span><span style={{ color: "var(--fg)" }}>{props.table}</span>
      </div>

      {/* 上:字段定义 */}
      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <div style={{ padding: "4px 8px", color: "var(--fg-muted)", fontSize: 10 }}>字段({columns.length})</div>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={th}>Name</th><th style={th}>Type</th><th style={th}>Default</th>
              <th style={th}>Comment</th><th style={th}>NotNull</th><th style={th}>Primary</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((c) => (
              <tr key={c.name}
                  onContextMenu={(e) => { e.preventDefault(); props.onColContext?.(e.clientX, e.clientY); }}>
                <td style={{ ...td, color: "var(--syn-entity)" }}>{c.name}</td>
                <td style={{ ...td, color: "var(--syn-type)" }}>{c.dataType}</td>
                <td style={td}>{dim(c.default)}</td>
                <td style={td}>{dim(c.comment)}</td>
                <td style={{ ...td, textAlign: "center" }}>{check(c.notNull)}</td>
                <td style={{ ...td, textAlign: "center" }}>{check(c.isPk)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 下:索引 */}
      <div style={{ flex: 1, minHeight: 0, overflow: "auto", borderTop: "2px solid var(--border)" }}>
        <div style={{ padding: "4px 8px", color: "var(--fg-muted)", fontSize: 10 }}>索引({indexes.length})</div>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={th}>Name</th><th style={th}>Columns</th>
              <th style={th}>Primary</th><th style={th}>Unique</th>
            </tr>
          </thead>
          <tbody>
            {indexes.map((i) => (
              <tr key={i.name}>
                <td style={td}>{i.name}</td>
                <td style={td}>{i.columns}</td>
                <td style={{ ...td, textAlign: "center" }}>{check(i.isPrimary)}</td>
                <td style={{ ...td, textAlign: "center" }}>{check(i.isUnique)}</td>
              </tr>
            ))}
            {indexes.length === 0 && (
              <tr><td style={{ ...td, color: "var(--fg-muted)" }} colSpan={4}>无索引</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
