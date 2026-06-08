import { useEffect, useState } from "react";
import { useTheme } from "./theme/ThemeProvider";
import { useStore } from "./state/store";
import { listConnections, saveConnection } from "./api/connections";
import { pgConnect, pgListObjects, pgQuery, pgTableDetail, pgCommitEdits } from "./api/pg";
import type { QueryResult, TableDetail as Detail } from "./api/pg";
import { ConnectionList } from "./components/Sidebar/ConnectionList";
import { ConnectionForm } from "./components/Sidebar/ConnectionForm";
import { ObjectTree } from "./components/Sidebar/ObjectTree";
import { SqlEditor } from "./components/editor/SqlEditor";
import { ResultGrid } from "./components/results/ResultGrid";
import { TableDetail } from "./components/detail/TableDetail";
import type { Connection } from "./types";

export default function App() {
  const { name, toggle } = useTheme();
  const store = useStore();
  const { connections, activeId, activeTable, dirtyEdits } = store;
  const [showForm, setShowForm] = useState(false);
  const [tables, setTables] = useState<string[]>([]);
  const [sql, setSql] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = () => listConnections().then(store.setConnections);
  useEffect(() => { refresh(); }, []);

  const pkCol = detail?.columns.find((c) => c.isPk)?.name ?? null;
  const dirtyKeys = new Set(Object.keys(dirtyEdits));

  const onActivate = async (id: string) => {
    setErr(null);
    store.activate(id);
    try { await pgConnect(id); setTables(await pgListObjects(id)); }
    catch (e) { setErr(JSON.stringify(e)); }
  };

  const runSql = async () => {
    if (!activeId) return;
    setErr(null);
    try { setResult(await pgQuery(activeId, sql)); }
    catch (e) { setErr(JSON.stringify(e)); }
  };

  const onSelectTable = async (t: string) => {
    if (!activeId) return;
    store.selectTable(t);
    store.clearEdits();
    const q = `SELECT * FROM "${t}" LIMIT 200`;
    setSql(q);
    try {
      setResult(await pgQuery(activeId, q));
      setDetail(await pgTableDetail(activeId, t));
    } catch (e) { setErr(JSON.stringify(e)); }
  };

  const commit = async () => {
    if (!activeId || !activeTable) return;
    const edits = Object.values(dirtyEdits).map((e) => ({ ...e, table: activeTable }));
    try {
      await pgCommitEdits(activeId, edits);
      store.clearEdits();
      setResult(await pgQuery(activeId, sql));
    } catch (e) { setErr(JSON.stringify(e)); }
  };

  const onSubmit = async (conn: Connection, pw: string) => {
    // 始终传密码(含空串):空密码会作为有效凭据存下,而非"不设置密码",
    // 这样 local 无密码/trust 认证的连接也能建立。
    await saveConnection(conn, pw);
    setShowForm(false); refresh();
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside style={{ width: 200, background: "var(--bg-panel)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 8, display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--fg-muted)", fontSize: 10 }}>连接</span>
          <button onClick={() => setShowForm(true)}>＋</button>
        </div>
        <ConnectionList connections={connections} activeId={activeId} onPick={onActivate} />
        {activeId && <ObjectTree tables={tables} active={activeTable} onSelect={onSelectTable} />}
        {showForm && <ConnectionForm onSubmit={onSubmit} onCancel={() => setShowForm(false)} />}
        <div style={{ marginTop: "auto", padding: 8 }}>
          <button onClick={toggle}>主题:{name}</button>
        </div>
      </aside>

      <main style={{ flex: 1.5, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, minHeight: 0 }}>
          <SqlEditor value={sql} onChange={setSql} onRun={runSql} />
        </div>
        <div style={{ flex: 1.2, minHeight: 0, overflow: "auto" }}>
          {err && <div style={{ color: "var(--error)", padding: 8, fontSize: 11 }}>{err}</div>}
          {result && <ResultGrid result={result} pkCol={pkCol} dirtyKeys={dirtyKeys}
                       onStage={(e) => store.stageEdit({ ...e, table: activeTable ?? "" })} onCommit={commit} />}
        </div>
      </main>

      <aside style={{ width: 200, background: "var(--bg-panel)" }}>
        {detail && activeTable
          ? <TableDetail detail={detail} table={activeTable} />
          : <div style={{ padding: 8, color: "var(--fg-muted)", fontSize: 10 }}>详情</div>}
      </aside>
    </div>
  );
}
