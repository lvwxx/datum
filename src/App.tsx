import { useEffect, useState } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
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

const PAGE_SIZE = 100;

/** 横向分组里的竖直拖动条 */
function HHandle() {
  return <PanelResizeHandle style={{ width: 5, background: "var(--border)", cursor: "col-resize" }} />;
}
/** 纵向分组里的水平拖动条 */
function VHandle() {
  return <PanelResizeHandle style={{ height: 5, background: "var(--border)", cursor: "row-resize" }} />;
}

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
  const [browseTable, setBrowseTable] = useState<string | null>(null); // 正在分页浏览的表;手动 SQL 时为 null
  const [page, setPage] = useState(0);

  const refresh = () => listConnections().then(store.setConnections);
  useEffect(() => { refresh(); }, []);

  const pkCol = detail?.columns.find((c) => c.isPk)?.name ?? null;
  const dirtyKeys = new Set(Object.keys(dirtyEdits));
  const activeConn = connections.find((c) => c.id === activeId) ?? null;
  const canNext = browseTable !== null && result !== null && result.rows.length === PAGE_SIZE;
  const canPrev = browseTable !== null && page > 0;

  const onActivate = async (id: string) => {
    setErr(null);
    store.activate(id);
    setBrowseTable(null); setResult(null); setDetail(null); setPage(0);
    try { await pgConnect(id); setTables(await pgListObjects(id)); }
    catch (e) { setErr(JSON.stringify(e)); }
  };

  const loadTablePage = async (t: string, p: number) => {
    if (!activeId) return;
    const q = `SELECT * FROM "${t}" LIMIT ${PAGE_SIZE} OFFSET ${p * PAGE_SIZE}`;
    setSql(q);
    setResult(await pgQuery(activeId, q));
  };

  const onSelectTable = async (t: string) => {
    if (!activeId) return;
    setErr(null);
    store.selectTable(t);
    store.clearEdits();
    setBrowseTable(t); setPage(0);
    try {
      await loadTablePage(t, 0);
      setDetail(await pgTableDetail(activeId, t));
    } catch (e) { setResult(null); setErr(JSON.stringify(e)); }
  };

  const gotoPage = async (p: number) => {
    if (!activeId || !browseTable || p < 0) return;
    setErr(null);
    try { setPage(p); await loadTablePage(browseTable, p); }
    catch (e) { setErr(JSON.stringify(e)); }
  };

  const runSql = async () => {
    if (!activeId) { setErr("请先在左侧选择一个连接"); return; }
    if (!sql.trim()) { setErr("SQL 为空"); return; }
    setErr(null);
    setBrowseTable(null); setPage(0); // 手动 SQL 不参与分页
    try { setResult(await pgQuery(activeId, sql)); }
    catch (e) { setResult(null); setErr(JSON.stringify(e)); }
  };

  const commit = async () => {
    if (!activeId || !activeTable) return;
    const edits = Object.values(dirtyEdits).map((e) => ({ ...e, table: activeTable }));
    try {
      await pgCommitEdits(activeId, edits);
      store.clearEdits();
      if (browseTable) await loadTablePage(browseTable, page);
      else setResult(await pgQuery(activeId, sql));
    } catch (e) { setErr(JSON.stringify(e)); }
  };

  const openNew = () => { setEditConn(null); setFormOpen(true); };
  const openEdit = (c: Connection) => { setEditConn(c); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditConn(null); };

  const onSubmit = async (conn: Connection, pw: string) => {
    // 新增:始终传密码(含空串)。编辑:留空表示不修改(传 undefined),非空才更新。
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
    <div style={{ height: "100vh" }}>
      <PanelGroup direction="horizontal" autoSaveId="dbstudio-cols">
        {/* 左栏:连接(可滚动) + 表树(独立滚动,固定头尾) */}
        <Panel defaultSize={18} minSize={10}>
          <aside style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg-panel)", overflow: "hidden" }}>
            <div style={{ padding: 8, display: "flex", justifyContent: "space-between", flexShrink: 0 }}>
              <span style={{ color: "var(--fg-muted)", fontSize: 10 }}>连接</span>
              <button onClick={openNew} title="新建连接">＋</button>
            </div>
            <div style={{ flexShrink: 0, maxHeight: "40%", overflow: "auto" }}>
              <ConnectionList connections={connections} activeId={activeId} onPick={onActivate} onEdit={openEdit} />
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: "auto", borderTop: "1px solid var(--border)" }}>
              {activeId && <ObjectTree tables={tables} active={activeTable} onSelect={onSelectTable} />}
            </div>
            <div style={{ padding: 8, flexShrink: 0, borderTop: "1px solid var(--border)" }}>
              <button onClick={toggle}>主题:{name}</button>
            </div>
          </aside>
        </Panel>

        <HHandle />

        {/* 中栏:连接信息条 + (SQL 上 / 结果下,可拖动) */}
        <Panel defaultSize={58} minSize={25}>
          <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "5px 10px", fontSize: 12, borderBottom: "1px solid var(--border)", background: "var(--bg-panel)", color: activeConn ? "var(--fg)" : "var(--fg-muted)", flexShrink: 0 }}>
              {activeConn
                ? <span>🔌 {activeConn.name} · 库 <b>{activeConn.database}</b>{activeTable ? ` · 表 ${activeTable}` : ""}</span>
                : <span>未连接 —— 点左侧连接</span>}
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <PanelGroup direction="vertical" autoSaveId="dbstudio-mid">
                <Panel defaultSize={45} minSize={15}>
                  <div style={{ height: "100%", overflow: "hidden" }}>
                    <SqlEditor value={sql} onChange={setSql} onRun={runSql} />
                  </div>
                </Panel>

                <VHandle />

                <Panel defaultSize={55} minSize={15}>
                  <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                    <div style={{ padding: "4px 10px", fontSize: 11, color: "var(--fg-muted)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                      {err ? <span style={{ color: "var(--error)" }}>查询出错</span>
                        : result ? `${result.rows.length} 行 · ${result.columns.length} 列${result.affected != null ? ` · 影响 ${result.affected}` : ""}`
                        : activeId ? "就绪,运行 SQL 或点左侧表" : "未连接"}
                    </div>
                    <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                      {err && <div style={{ color: "var(--error)", padding: 8, fontSize: 12, whiteSpace: "pre-wrap" }}>{err}</div>}
                      {!err && result && result.rows.length === 0 &&
                        <div style={{ padding: 8, color: "var(--fg-muted)", fontSize: 12 }}>查询成功,但没有行(0 行)</div>}
                      {!err && result && result.rows.length > 0 &&
                        <ResultGrid result={result} pkCol={pkCol} dirtyKeys={dirtyKeys}
                          onStage={(e) => store.stageEdit({ ...e, table: activeTable ?? "" })} onCommit={commit} />}
                    </div>
                    {browseTable && (
                      <div style={{ flexShrink: 0, borderTop: "1px solid var(--border)", padding: "4px 10px", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, fontSize: 12 }}>
                        <span style={{ color: "var(--fg-muted)" }}>第 {page + 1} 页 · 每页 {PAGE_SIZE}</span>
                        <button disabled={!canPrev} onClick={() => gotoPage(page - 1)} title="上一页">←</button>
                        <button disabled={!canNext} onClick={() => gotoPage(page + 1)} title="下一页">→</button>
                      </div>
                    )}
                  </div>
                </Panel>
              </PanelGroup>
            </div>
          </div>
        </Panel>

        <HHandle />

        {/* 右栏:表详情 */}
        <Panel defaultSize={24} minSize={12}>
          <aside style={{ height: "100%", overflow: "auto", background: "var(--bg-panel)" }}>
            {detail && activeTable
              ? <TableDetail detail={detail} table={activeTable} />
              : <div style={{ padding: 8, color: "var(--fg-muted)", fontSize: 10 }}>详情</div>}
          </aside>
        </Panel>
      </PanelGroup>

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
