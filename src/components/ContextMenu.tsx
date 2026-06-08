export interface MenuItem {
  label: string;
  danger?: boolean;
  onClick: () => void;
}

/** 轻量右键菜单:全屏遮罩点击即关闭,菜单定位在 (x, y)。 */
export function ContextMenu(props: { x: number; y: number; onClose: () => void; items: MenuItem[] }) {
  return (
    <>
      <div onClick={props.onClose}
           onContextMenu={(e) => { e.preventDefault(); props.onClose(); }}
           style={{ position: "fixed", inset: 0, zIndex: 200 }} />
      <div style={{
        position: "fixed", left: props.x, top: props.y, zIndex: 201, minWidth: 150,
        background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8,
        boxShadow: "0 6px 20px rgba(0,0,0,0.2)", padding: 4, fontSize: 13,
      }}>
        {props.items.map((it, i) => (
          <div key={i}
               onClick={() => { it.onClick(); props.onClose(); }}
               style={{ padding: "6px 10px", cursor: "pointer", borderRadius: 5, whiteSpace: "nowrap", color: it.danger ? "var(--error)" : "var(--fg)" }}>
            {it.label}
          </div>
        ))}
      </div>
    </>
  );
}
