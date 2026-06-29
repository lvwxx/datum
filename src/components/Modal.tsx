import { ReactNode } from "react";

/**
 * 居中弹窗:点击遮罩关闭,内容区不冒泡。
 * bare=true 时不渲染默认外观(背景/边框/圆角/宽度),由子内容自行决定。
 */
export function Modal(props: { onClose: () => void; children: ReactNode; maxWidth?: number; bare?: boolean }) {
  return (
    <div
      onClick={props.onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: props.bare ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={props.bare ? undefined : {
          background: "var(--bg)", color: "var(--fg)",
          border: "1px solid var(--border)", borderRadius: 10,
          minWidth: 380, maxWidth: props.maxWidth ?? 480, width: "90%",
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
        }}
      >
        {props.children}
      </div>
    </div>
  );
}
