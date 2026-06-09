/** 行详情:每个字段两行——上行列名+类型,下行完整值(可换行)。 */
export function RowDetail(props: {
  columns: string[];
  values: (string | null)[];
  types: Record<string, string>;
  onBack: () => void;
}) {
  return (
    <div data-keep-sel style={{ display: "flex", flexDirection: "column", height: "100%", fontSize: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <span style={{ color: "var(--fg-muted)", fontSize: 10, textTransform: "uppercase" }}>行详情</span>
        <button onClick={props.onBack} title="返回表结构"
          style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "2px 8px", cursor: "pointer", fontSize: 11, color: "var(--fg-muted)" }}>
          ← 结构
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {props.columns.map((c, i) => (
          <div key={c} style={{ padding: "7px 10px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
              <span style={{ color: "var(--syn-entity)", fontWeight: 600 }}>{c}</span>
              <span style={{ color: "var(--syn-type)", fontSize: 10, flexShrink: 0 }}>{props.types[c] ?? "—"}</span>
            </div>
            <div className="mono" style={{ wordBreak: "break-all", whiteSpace: "pre-wrap", color: props.values[i] == null ? "var(--fg-muted)" : "var(--fg)" }}>
              {props.values[i] == null ? "NULL" : props.values[i]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
