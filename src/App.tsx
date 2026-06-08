import { useEffect, useState } from "react";
import { useTheme } from "./theme/ThemeProvider";
import { useStore } from "./state/store";
import { listConnections, saveConnection, deleteConnection } from "./api/connections";
import { pgConnect, pgListObjects, pgQuery, pgTableDetail, pgCommitEdits } from "./api/pg";
import type { QueryResult, TableDetail as Detail } from "./api/pg";
import { Modal } from "./components/Modal";
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
  const [formOpen, setFormOpen] = useState(false);
  const [editConn, setEditConn] = useState<Connection | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [sql, setSql] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = () => listConnections().then(store.setConnections);
  useEffect(() => { refresh(); }, []);

  const pkCol = detail?.columns.find((c) => c.isPk)?.name ?? null;
  const dirtyKeys = new Set(Object.keys(dirtyEdits));
  const activeConn = connections.find((c) => c.id === activeId) ?? null;

  const onActivate = async (id: string) => {
    setErr(null);
    store.activate(id);
    try { await pgConnect(id); setTables(await pgListObjects(id)); }
    catch (e) { setErr(JSON.stringify(e)); }
  };

  const runSql = async () => {
    if (!activeId) { setErr("请先在左侧选择一个连接"); return; }
    if (!sql.trim()) { setErr("SQL 为空"); return; }
    setErr(null);
    try { setResult(await pgQuery(activeId, sql)); }
    catch (e) { setResult(null); setErr(JSON.stringify(e)); }
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

  const openNew = () => { setEditConn(null); setFormOpen(true); };
  const openEdit = (c: Connection) => { setEditConn(c); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditConn(null); };

  const onSubmit = async (conn: Connection, pw: string) => {
    // 新增:始终传密码(含空串),空密码作为有效凭据存下(支持 local 无密码/trust 认证)。
    // 编辑:密码框留空表示"不修改",传 undefined 让后端沿用原密码;非空才更新。
    const password = editConn ? (pw === "" ? undefined : pw) : pw;
    await saveConnection(conn, password);
    closeForm(); refresh();
  };

  const onDelete = async () => {
    if (!editConn) return;
    await deleteConnection(editConn.id);
    closeForm(); refresh();
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside style={{ width: 200, background: "var(--bg-panel)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 8, display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--fg-muted)", fontSize: 10 }}>连接</span>
          <button onClick={openNew} title="新建连接">＋</button>
        </div>
        <ConnectionList connections={connections} activeId={activeId} onPick={onActivate} onEdit={openEdit} />
        {activeId && <ObjectTree tables={tables} active={activeTable} onSelect={onSelectTable} />}
        <div style={{ marginTop: "auto", padding: 8 }}>
          <button onClick={toggle}>主题:{name}</button>
        </div>
      </aside>

      <main style={{ flex: 1.5, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "5px 10px", fontSize: 12, borderBottom: "1px solid var(--border)",
                      color: activeConn ? "var(--fg)" : "var(--fg-muted)", background: "var(--bg-panel)" }}>
          {activeConn
            ? <span>🔌 {activeConn.name} · 库 <b>{activeConn.database}</b>{activeTable ? ` · 表 ${activeTable}` : ""}</span>
            : <span>未连接 —— 点左侧连接</span>}
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <SqlEditor value={sql} onChange={setSql} onRun={runSql} />
        </div>
        <div style={{ flex: 1.2, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "4px 10px", fontSize: 11, color: "var(--fg-muted)",
                        borderBottom: "1px solid var(--border)" }}>
            {err ? <span style={{ color: "var(--error)" }}>查询出错</span>
              : result ? `${result.rows.length} 行 · ${result.columns.length} 列${result.affected != null ? ` · 影响 ${result.affected}` : ""}`
              : activeId ? "就绪,运行 SQL 或点左侧表" : "未连接"}
          </div>
          {err && <div style={{ color: "var(--error)", padding: 8, fontSize: 12, whiteSpace: "pre-wrap" }}>{err}</div>}
          {!err && result && result.rows.length === 0 &&
            <div style={{ padding: 8, color: "var(--fg-muted)", fontSize: 12 }}>查询成功,但没有行(0 行)</div>}
          {!err && result && result.rows.length > 0 &&
            <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
              <ResultGrid result={result} pkCol={pkCol} dirtyKeys={dirtyKeys}
                onStage={(e) => store.stageEdit({ ...e, table: activeTable ?? "" })} onCommit={commit} />
            </div>}
        </div>
      </main>

      <aside style={{ width: 200, background: "var(--bg-panel)" }}>
        {detail && activeTable
          ? <TableDetail detail={detail} table={activeTable} />
          : <div style={{ padding: 8, color: "var(--fg-muted)", fontSize: 10 }}>详情</div>}
      </aside>

      {formOpen && (
        <Modal onClose={closeForm}>
          <ConnectionForm
            key={editConn?.id ?? "new"}
            initial={editConn ?? undefined}
            onSubmit={onSubmit}
            onCancel={closeForm}
            onDelete={editConn ? onDelete : undefined}
          />
        </Modal>
      )}
    </div>
  );
}
