import { useEffect, useState } from "react";
import { useTheme } from "./theme/ThemeProvider";
import { useStore } from "./state/store";
import { listConnections, saveConnection } from "./api/connections";
import { ConnectionList } from "./components/Sidebar/ConnectionList";
import { ConnectionForm } from "./components/Sidebar/ConnectionForm";
import type { Connection } from "./types";

export default function App() {
  const { name, toggle } = useTheme();
  const { connections, activeId, setConnections, activate } = useStore();
  const [showForm, setShowForm] = useState(false);

  const refresh = () => listConnections().then(setConnections);
  useEffect(() => { refresh(); }, []);

  const onSubmit = async (conn: Connection, pw: string) => {
    await saveConnection(conn, pw || undefined);
    setShowForm(false);
    refresh();
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside style={{ width: 200, background: "var(--bg-panel)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 8, display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--fg-muted)", fontSize: 10 }}>连接</span>
          <button onClick={() => setShowForm(true)}>＋</button>
        </div>
        <ConnectionList connections={connections} activeId={activeId} onPick={activate} />
        {showForm && <ConnectionForm onSubmit={onSubmit} onCancel={() => setShowForm(false)} />}
        <div style={{ marginTop: "auto", padding: 8 }}>
          <button onClick={toggle}>主题:{name}</button>
        </div>
      </aside>
      <main style={{ flex: 1.5, borderRight: "1px solid var(--border)" }}>
        <div style={{ padding: 12, color: "var(--fg-muted)" }}>选择左侧连接后开始(PG 工作区在后续任务接入)</div>
      </main>
      <aside style={{ width: 200, background: "var(--bg-panel)" }}>
        <div style={{ padding: 8, color: "var(--fg-muted)", fontSize: 10 }}>详情</div>
      </aside>
    </div>
  );
}
