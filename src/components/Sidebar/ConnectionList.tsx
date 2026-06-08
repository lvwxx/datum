import type { ReactNode } from "react";
import type { Connection, Env } from "../../types";
import { MiddleEllipsis } from "../MiddleEllipsis";

const envVar: Record<Env, string> = {
  local: "var(--env-local)", staging: "var(--env-staging)", prod: "var(--env-prod)",
};

export function ConnectionList(props: {
  connections: Connection[];
  activeId: string | null;
  onPick: (id: string) => void;
  onEdit: (c: Connection) => void;
  /** 哪个连接当前为展开状态(显示 ▾) */
  expandedId?: string | null;
  /** 在某个连接行下方渲染内容(如展开的表树) */
  renderUnder?: (c: Connection) => ReactNode;
}) {
  return (
    <div>
      {props.connections.map((c) => (
        <div key={c.id}>
          <div
            onClick={() => props.onPick(c.id)}
            style={{
              padding: "6px 8px", cursor: "pointer", display: "flex",
              alignItems: "center", gap: 6, overflow: "hidden",
              background: c.id === props.activeId ? "var(--selection)" : "transparent",
            }}>
            <span style={{ flexShrink: 0, color: "var(--fg-muted)", width: 10, fontSize: 10 }}>
              {c.id === props.expandedId ? "▾" : "▸"}
            </span>
            <span style={{ flexShrink: 0 }}>🟢</span>
            <MiddleEllipsis text={c.name} />
            <span style={{
              flexShrink: 0, background: envVar[c.env], color: "#fff", fontSize: 9,
              padding: "0 5px", borderRadius: 3,
            }}>{c.env.toUpperCase()}</span>
            <button
              title="编辑"
              aria-label={`编辑 ${c.name}`}
              onClick={(e) => { e.stopPropagation(); props.onEdit(c); }}
              style={{
                flexShrink: 0, background: "transparent", border: 0,
                color: "var(--fg-muted)", cursor: "pointer", fontSize: 12, padding: 0,
              }}>✎</button>
          </div>
          {props.renderUnder?.(c)}
        </div>
      ))}
    </div>
  );
}
