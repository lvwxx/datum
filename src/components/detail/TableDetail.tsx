import type { TableDetail as Detail } from "../../api/pg";

export function TableDetail(props: { detail: Detail; table: string }) {
  return (
    <div style={{ padding: 8 }}>
      <div style={{ color: "var(--fg-muted)", fontSize: 10, textTransform: "uppercase" }}>
        <span>表详情 · </span><span>{props.table}</span>
      </div>
      <div className="mono" style={{ marginTop: 8, fontSize: 11, lineHeight: 1.7 }}>
        {props.detail.columns.map((c) => (
          <div key={c.name}>
            <span style={{ color: "var(--syn-entity)" }}>{c.name}</span>{" "}
            <span style={{ color: "var(--syn-type)" }}>{c.dataType}</span>
            {c.isPk && <span style={{ color: "var(--accent)" }}> PK</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
