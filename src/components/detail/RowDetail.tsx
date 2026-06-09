const th: React.CSSProperties = {
  textAlign: "left", fontWeight: 600, color: "var(--fg-muted)",
  padding: "3px 6px", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
  position: "sticky", top: 0, background: "var(--bg-panel)",
};
const td: React.CSSProperties = {
  padding: "3px 6px", borderBottom: "1px solid var(--border)", verticalAlign: "top",
  wordBreak: "break-all",
};

/** 行详情:把选中行展开为 列名 / 值 / 类型 的列表。 */
export function RowDetail(props: {
  columns: string[];
  values: (string | null)[];
  types: Record<string, string>;
  onBack: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontSize: 11 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <span style={{ color: "var(--fg-muted)", fontSize: 10, textTransform: "uppercase" }}>行详情</span>
        <button onClick={props.onBack} title="返回表结构"
          style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "2px 8px", cursor: "pointer", fontSize: 11, color: "var(--fg-muted)" }}>
          ← 结构
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr><th style={th}>列名</th><th style={th}>值</th><th style={th}>类型</th></tr>
          </thead>
          <tbody>
            {props.columns.map((c, i) => (
              <tr key={c}>
                <td style={{ ...td, color: "var(--syn-entity)" }}>{c}</td>
                <td style={td}>
                  {props.values[i] == null
                    ? <span style={{ color: "var(--fg-muted)" }}>NULL</span>
                    : props.values[i]}
                </td>
                <td style={{ ...td, color: "var(--syn-type)" }}>{props.types[c] ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
