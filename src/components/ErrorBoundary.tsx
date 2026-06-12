import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * 顶层错误边界:渲染期抛出的异常不再让整个应用白屏,而是显示错误信息与堆栈,
 * 并提供「重新加载」按钮(无需重启进程)。同时把错误打到 console 便于排查。
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null; info: ErrorInfo | null }
> {
  state = { error: null as Error | null, info: null as ErrorInfo | null };

  static getDerivedStateFromError(error: Error) {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] 渲染异常:", error, info);
    this.setState({ error, info });
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;
    return (
      <div style={{ padding: 24, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13, color: "#e74c3c", height: "100vh", overflow: "auto", background: "#1e1e1e" }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>界面渲染出错</div>
        <div style={{ whiteSpace: "pre-wrap", marginBottom: 12 }}>{error.message}</div>
        <pre style={{ whiteSpace: "pre-wrap", color: "#aaa", fontSize: 11 }}>{error.stack}</pre>
        {info?.componentStack && (
          <pre style={{ whiteSpace: "pre-wrap", color: "#888", fontSize: 11 }}>{info.componentStack}</pre>
        )}
        <button onClick={() => location.reload()}
          style={{ marginTop: 12, padding: "6px 16px", cursor: "pointer", background: "#3498db", color: "#fff", border: 0, borderRadius: 6 }}>
          重新加载
        </button>
      </div>
    );
  }
}
