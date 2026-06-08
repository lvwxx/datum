import { create } from "zustand";

type Kind = "success" | "error" | "info";
interface ToastItem { id: number; msg: string; kind: Kind; }
interface ToastStore { toasts: ToastItem[]; push: (msg: string, kind?: Kind) => void; }

let seq = 0;

const useToasts = create<ToastStore>((set) => ({
  toasts: [],
  push: (msg, kind = "success") => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts, { id, msg, kind }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 1800);
  },
}));

/** 全局调用入口 */
export const toast = {
  success: (m: string) => useToasts.getState().push(m, "success"),
  error: (m: string) => useToasts.getState().push(m, "error"),
  info: (m: string) => useToasts.getState().push(m, "info"),
};

const accentOf = (k: Kind) => (k === "error" ? "var(--error)" : k === "info" ? "var(--fg-muted)" : "var(--accent)");
const iconOf = (k: Kind) => (k === "error" ? "✕" : k === "info" ? "•" : "✓");

/** 统一的轻提示容器,渲染一次即可。 */
export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div style={{
      position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)",
      zIndex: 500, display: "flex", flexDirection: "column", gap: 8, alignItems: "center", pointerEvents: "none",
    }}>
      {toasts.map((t) => (
        <div key={t.id} className="toast-in" style={{
          display: "flex", alignItems: "center", gap: 9,
          background: "var(--bg)", color: "var(--fg)",
          border: "1px solid var(--border)", borderRadius: 11,
          padding: "9px 16px", fontSize: 13,
          boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
        }}>
          <span style={{
            width: 17, height: 17, borderRadius: "50%", flexShrink: 0,
            background: accentOf(t.kind), color: "#fff",
            display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11,
          }}>{iconOf(t.kind)}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
