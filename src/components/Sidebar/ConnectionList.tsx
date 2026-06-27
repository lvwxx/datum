import type { ReactNode } from "react";
import { Database, KeyRound, Pencil } from "lucide-react";
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
  /** 哪个连接当前为展开状态 */
  expandedId?: string | null;
  /** 在某个连接行下方渲染内容(如展开的表树) */
  renderUnder?: (c: Connection) => ReactNode;
  /** 右键连接行(用于上下文菜单) */
  onContext?: (c: Connection, x: number, y: number) => void;
}) {
  return (
    <div>
      {props.connections.map((c) => {
        const active = c.id === props.activeId;
        const color = envVar[c.env];
        return (
          <div key={c.id}>
            <div
              className={`side-row${active ? " active" : ""}`}
              onClick={() => props.onPick(c.id)}
              onContextMenu={(e) => { e.preventDefault(); props.onContext?.(c, e.clientX, e.clientY); }}
              style={{
                margin: "0 8px 6px", padding: "9px 10px", borderRadius: 6, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8, overflow: "hidden",
              }}
            >
              {c.kind === "redis"
                ? <KeyRound size={17} color="var(--accent-bright)" style={{ flexShrink: 0 }} />
                : <Database size={17} color="var(--accent-bright)" style={{ flexShrink: 0 }} />}
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>
                <MiddleEllipsis text={c.name} />
              </span>
              <span style={{
                flexShrink: 0, color, border: `1px solid ${color}`, borderRadius: 9999,
                fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                padding: "2px 6px", lineHeight: 1,
              }}>{c.env.toUpperCase()}</span>
              <button
                className="icon-btn"
                title="编辑"
                aria-label={`编辑 ${c.name}`}
                onClick={(e) => { e.stopPropagation(); props.onEdit(c); }}
                style={{ width: 22, height: 22, flexShrink: 0 }}
              ><Pencil size={13} /></button>
            </div>
            {props.renderUnder?.(c)}
          </div>
        );
      })}
    </div>
  );
}
