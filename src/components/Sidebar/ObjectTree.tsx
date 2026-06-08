import { MiddleEllipsis } from "../MiddleEllipsis";

export function ObjectTree(props: {
  tables: string[];
  active: string | null;
  onSelect: (t: string) => void;
  onContext?: (t: string, x: number, y: number) => void;
}) {
  return (
    <div style={{ padding: "2px 0" }}>
      {props.tables.map((t) => (
        <div key={t}
             onClick={() => props.onSelect(t)}
             onContextMenu={(e) => {
               e.preventDefault();
               const r = e.currentTarget.getBoundingClientRect();
               props.onContext?.(t, r.right, r.top + r.height / 2);
             }}
             style={{
               padding: "3px 8px 3px 28px", cursor: "pointer", fontSize: 12,
               display: "flex", alignItems: "center", gap: 4, overflow: "hidden",
               background: t === props.active ? "var(--selection)" : "transparent",
             }}>
          <span style={{ color: "var(--fg-muted)", flexShrink: 0 }}>▦</span>
          <MiddleEllipsis text={t} />
        </div>
      ))}
    </div>
  );
}
