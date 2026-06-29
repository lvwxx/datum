import { Table as TableIcon } from "lucide-react";
import { MiddleEllipsis } from "../MiddleEllipsis";

/** 表 / key 列表。激活项:左侧 3px 绿条 + 加粗 + 高亮底色。 */
export function ObjectTree(props: {
  tables: string[];
  active: string | null;
  /** 当前被右键(上下文菜单锚定)的表,用于高亮 */
  contextTable?: string | null;
  onSelect: (t: string) => void;
  onContext?: (t: string, x: number, y: number) => void;
}) {
  return (
    <div style={{ padding: "2px 8px 6px" }}>
      {props.tables.map((t) => {
        const active = t === props.active;
        const ctx = t === props.contextTable;
        return (
          <div
            key={t}
            className={`side-row${active ? " active" : ""}`}
            onClick={() => props.onSelect(t)}
            onContextMenu={(e) => {
              e.preventDefault();
              const r = e.currentTarget.getBoundingClientRect();
              props.onContext?.(t, r.right - 6, r.top - 4);
            }}
            style={{
              position: "relative", height: 30, marginBottom: 1, borderRadius: 4,
              padding: "0 12px 0 38px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 9, overflow: "hidden",
              boxShadow: ctx ? "inset 0 0 0 1px var(--accent)" : undefined,
            }}
          >
            {active && (
              <span style={{
                position: "absolute", left: 0, top: 5, bottom: 5, width: 3,
                background: "var(--accent)", borderRadius: "0 3px 3px 0",
              }} />
            )}
            <TableIcon size={13} color={active ? "var(--fg)" : "var(--fg-faint)"} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: active ? 700 : 400, color: active ? "var(--fg)" : "var(--fg-soft)" }}>
              <MiddleEllipsis text={t} />
            </span>
          </div>
        );
      })}
    </div>
  );
}
