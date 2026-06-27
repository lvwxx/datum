import { X } from "lucide-react";

interface TabInfo { id: string; title: string; }

/** 标签条(高 40):mono 标签,激活态绿色顶条 + 背景与编辑器一致。 */
export function TabStrip(props: {
  tabs: TabInfo[];
  activeTabId: string | null;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onContext: (id: string, x: number, y: number) => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "stretch", height: 40, flexShrink: 0,
      overflowX: "auto", background: "var(--tabstrip-bg)",
      borderBottom: "1px solid var(--border)",
    }}>
      {props.tabs.map((t) => {
        const active = t.id === props.activeTabId;
        return (
          <div
            key={t.id}
            onClick={() => props.onActivate(t.id)}
            onContextMenu={(e) => { e.preventDefault(); props.onContext(t.id, e.clientX, e.clientY); }}
            title={t.title}
            style={{
              position: "relative", display: "flex", alignItems: "center", gap: 8,
              padding: "0 14px", height: 40, cursor: "pointer", whiteSpace: "nowrap",
              borderRight: "1px solid var(--border)",
              background: active ? "var(--editor-bg)" : "transparent",
            }}
          >
            {active && (
              <span style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "var(--accent)" }} />
            )}
            <span className="mono" style={{
              fontSize: 13, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis",
              fontWeight: active ? 700 : 400,
              color: active ? "var(--fg)" : "var(--fg-muted)",
            }}>
              {t.title}
            </span>
            <span
              onClick={(e) => { e.stopPropagation(); props.onClose(t.id); }}
              title="关闭"
              className="icon-btn"
              style={{ width: 16, height: 16, borderRadius: "50%" }}
            >
              <X size={11} />
            </span>
          </div>
        );
      })}
    </div>
  );
}
