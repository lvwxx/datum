import type { ReactNode } from "react";
import { Database, KeyRound, ChevronRight } from "lucide-react";
import type { Connection, Env } from "../../types";
import type { ConnView } from "../../lib/sidebarSearch";
import { MiddleEllipsis } from "../MiddleEllipsis";

const envVar: Record<Env, string> = {
  local: "var(--env-local)", staging: "var(--env-staging)", prod: "var(--env-prod)",
};

/**
 * 连接树:每行 = 展开箭头 + 库图标 + 名称 + 连接状态点 + env 徽章。
 * 整行点击切换展开;展开的连接通过 renderUnder 在下方渲染表列表。
 * 编辑/删除走右键菜单(onContext),无行内按钮。
 */
export function ConnectionList(props: {
  views: ConnView[];
  activeId: string | null;
  connectedIds: Record<string, boolean>;
  onToggle: (id: string) => void;
  onContext?: (c: Connection, x: number, y: number) => void;
  renderUnder?: (c: Connection, view: ConnView) => ReactNode;
}) {
  return (
    <div>
      {props.views.map(({ conn: c, expanded, tables }) => {
        const active = c.id === props.activeId;
        const connected = !!props.connectedIds[c.id];
        const color = envVar[c.env];
        return (
          <div key={c.id}>
            <div
              className={`side-row${active ? " active" : ""}`}
              onClick={() => props.onToggle(c.id)}
              onContextMenu={(e) => { e.preventDefault(); props.onContext?.(c, e.clientX, e.clientY); }}
              style={{
                position: "relative", margin: "0 8px 1px", padding: "0 10px 0 8px", height: 34,
                borderRadius: 4, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8, overflow: "hidden",
              }}
            >
              <span style={{
                display: "flex", flex: "0 0 14px", justifyContent: "center", alignItems: "center",
                color: "var(--fg-faint)",
                transform: expanded ? "rotate(90deg)" : "none",
                transition: "transform 0.12s cubic-bezier(0.3,0,0,1)",
              }}>
                <ChevronRight size={12} strokeWidth={2.6} />
              </span>
              {c.kind === "redis"
                ? <KeyRound size={16} color={expanded ? "var(--fg-soft)" : "var(--accent-bright)"} style={{ flexShrink: 0 }} />
                : <Database size={16} color={expanded ? "var(--fg-soft)" : "var(--accent-bright)"} style={{ flexShrink: 0 }} />}
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>
                <MiddleEllipsis text={c.name} />
              </span>
              <span
                title={connected ? "已连接" : "未连接"}
                style={{
                  width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                  background: connected ? "var(--accent)" : "transparent",
                  boxShadow: connected ? "none" : "inset 0 0 0 1.5px var(--fg-faint)",
                }}
              />
              <span style={{
                flexShrink: 0, color, border: `1px solid ${color}`, borderRadius: 9999,
                fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                padding: "2px 6px", lineHeight: 1,
              }}>{c.env.toUpperCase()}</span>
            </div>
            {expanded && props.renderUnder?.(c, { conn: c, expanded, tables })}
          </div>
        );
      })}
    </div>
  );
}
