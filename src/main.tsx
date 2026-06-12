import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./theme/ThemeProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./theme/theme.css";

// ⌘R / Ctrl+R:重新加载整个应用。注册在 React 之外的全局层,
// 这样即使 App 因渲染异常卸载(白屏)时仍能触发,用于快速恢复而无需重启进程。
window.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "r") {
    e.preventDefault();
    location.reload();
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider><App /></ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
