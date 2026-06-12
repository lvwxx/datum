import { MiddleEllipsis } from "../MiddleEllipsis";

export function ObjectTree(props: {
  tables: string[];
  active: string | null;
  /** 当前被右键(上下文菜单锚定)的表,用于高亮 */
  contextTable?: string | null;
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
               // 锚定到高亮框左上角附近,略上移补偿菜单自身内边距,避免偏下
               props.onContext?.(t, r.right - 6, r.top - 4);
             }}
             style={{
               margin: "1px 6px", padding: "3px 8px 3px 22px", cursor: "pointer", fontSize: 12,
               display: "flex", alignItems: "center", gap: 4, overflow: "hidden",
               borderRadius: 6,
               // 始终保留 2px 透明边框,高亮时仅换色,避免布局抖动
               border: "2px solid transparent",
               borderColor: t === props.contextTable ? "var(--accent)" : "transparent",
               background: t === props.active ? "var(--selection)" : "transparent",
             }}>
          <span style={{ color: "var(--fg-muted)", flexShrink: 0 }}>▦</span>
          <MiddleEllipsis text={t} />
        </div>
      ))}
    </div>
  );
}
