/**
 * 顶部标题栏(高 40)。macOS 用原生红绿灯(titleBarStyle: Overlay),
 * 这里只负责:整条作为窗口拖拽区 + 居中的 Datum 字标。
 */
export function TitleBar() {
  return (
    <div
      data-tauri-drag-region
      style={{
        position: "relative",
        height: 40,
        flexShrink: 0,
        background: "var(--titlebar-bg)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // 左侧给 macOS 原生红绿灯留位
        paddingLeft: 78,
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    >
      {/* 居中字标:9px 绿色圆角方块 + Datum */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, pointerEvents: "none" }}>
        <span style={{ width: 9, height: 9, borderRadius: 2, background: "var(--accent-bright)" }} />
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", color: "var(--fg-soft)" }}>
          Datum
        </span>
      </div>
    </div>
  );
}
