import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { useTheme } from "./theme/ThemeProvider";
import { useStore } from "./state/store";
import { listConnections, saveConnection, deleteConnection } from "./api/connections";
import { pgConnect, pgListObjects, pgQuery, pgTableDetail, pgCommitEdits } from "./api/pg";
import type { QueryResult, TableDetail as Detail, CellEdit } from "./api/pg";
import { sqliteConnect, sqliteListObjects, sqliteQuery, sqliteTableDetail, sqliteCommitEdits } from "./api/sqlite";
import { redisConnect, redisScan, redisGetKey, redisKeyDetail, redisExec } from "./api/redis";
import type { RedisKeyDetail } from "./api/redis";
import { myConnect, myListObjects, myQuery, myTableDetail, myCommitEdits } from "./api/mysql";
import { Modal } from "./components/Modal";
import { ContextMenu } from "./components/ContextMenu";
import { SqlView } from "./components/SqlView";
import { Toaster, toast } from "./components/Toast";
import { buildCreateTable, buildInsert, buildInsertRow } from "./lib/sqlgen";
import { currentStatement, isQuery } from "./lib/sqlstmt";
import { copyToClipboard } from "./lib/clipboard";
import type { EditorView } from "@codemirror/view";
import { ConnectionList } from "./components/Sidebar/ConnectionList";
import { ConnectionForm } from "./components/Sidebar/ConnectionForm";
import { ObjectTree } from "./components/Sidebar/ObjectTree";
import { SqlEditor } from "./components/editor/SqlEditor";
import { ResultGrid } from "./components/results/ResultGrid";
import { TableDetail } from "./components/detail/TableDetail";
import { RowDetail } from "./components/detail/RowDetail";
import type { Connection, DbKind } from "./types";

const PAGE_SIZE = 100;

/** 一个工作标签页:绑定连接,持有各自的 SQL / 结果 / 分页 / 暂存编辑 */
interface Tab {
  id: string;
  connId: string;
  kind: DbKind;               // pg | redis | sqlite
  title: string;
  table: string | null;       // PG:编辑目标表 / Redis:key 名
  sql: string;                // PG:SQL / Redis:命令
  result: QueryResult | null; // 统一的列+行结果(Redis 的值也映射成此)
  detail: Detail | null;      // PG 表详情
  redisDetail: RedisKeyDetail | null; // Redis key 详情
  page: number;
  browseTable: string | null; // 非空表示处于分页浏览(仅 PG)
  dirty: Record<string, CellEdit>;
  err: string | null;
  selectedRow: number | null; // 结果中选中的行(用于右栏行详情)
  resultIsQuery: boolean;     // 当前结果来自查询(SELECT)还是非查询语句(DDL/DML)
  sort: SortState;            // 浏览表时的排序(点击表头);null 表示不排序
}

type SortState = { col: string; dir: "asc" | "desc" } | null;

function HHandle() {
  return <PanelResizeHandle style={{ width: 5, background: "var(--border)", cursor: "col-resize" }} />;
}
function VHandle() {
  return <PanelResizeHandle style={{ height: 5, background: "var(--border)", cursor: "row-resize" }} />;
}

// 关系型(pg / mysql / sqlite)统一分发:命令集 + 标识符引号
const relApi = (kind: DbKind) =>
  kind === "mysql"
    ? { connect: myConnect, list: myListObjects, query: myQuery, detail: myTableDetail, commit: myCommitEdits,
        q: (t: string) => `\`${t.replace(/`/g, "``")}\``, dialect: "mysql" as const }
    : kind === "sqlite"
    ? { connect: sqliteConnect, list: sqliteListObjects, query: sqliteQuery, detail: sqliteTableDetail, commit: sqliteCommitEdits,
        q: (t: string) => `"${t.replace(/"/g, '""')}"`, dialect: "sqlite" as const }
    : { connect: pgConnect, list: pgListObjects, query: pgQuery, detail: pgTableDetail, commit: pgCommitEdits,
        q: (t: string) => `"${t.replace(/"/g, '""')}"`, dialect: "pg" as const };

const pageSql = (t: string, p: number, kind: DbKind, sort?: SortState) => {
  const order = sort ? ` ORDER BY ${relApi(kind).q(sort.col)} ${sort.dir === "desc" ? "DESC" : "ASC"}` : "";
  return `SELECT * FROM ${relApi(kind).q(t)}${order} LIMIT ${PAGE_SIZE} OFFSET ${p * PAGE_SIZE}`;
};

export default function App() {
  const { name, toggle } = useTheme();
  const store = useStore();
  const { connections, activeId } = store;
  const [formOpen, setFormOpen] = useState(false);
  const [editConn, setEditConn] = useState<Connection | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [treeOpen, setTreeOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const rightRef = useRef<ImperativePanelHandle>(null);
  const viewRef = useRef<EditorView | null>(null);

  // 运行时取:有选区跑选区,否则跑光标所在的那条语句
  const sqlToRun = (): string => {
    const v = viewRef.current;
    if (!v) return tab?.sql ?? "";
    const sel = v.state.selection.main;
    if (!sel.empty) return v.state.sliceDoc(sel.from, sel.to).trim();
    return currentStatement(v.state.doc.toString(), sel.head);
  };
  const selectionText = (): string => {
    const v = viewRef.current;
    if (!v) return "";
    const sel = v.state.selection.main;
    return sel.empty ? "" : v.state.sliceDoc(sel.from, sel.to);
  };
  const [menu, setMenu] = useState<{ c: Connection; x: number; y: number } | null>(null);
  const [confirmDel, setConfirmDel] = useState<Connection | null>(null);
  const [tableMenu, setTableMenu] = useState<{ table: string; x: number; y: number } | null>(null);
  const [colMenu, setColMenu] = useState<{ x: number; y: number } | null>(null);
  const [ddl, setDdl] = useState<{ table: string; sql: string; x: number; y: number } | null>(null);
  const [tabMenu, setTabMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  const copyWithToast = (text: string) => { copyToClipboard(text); toast.success("已复制"); };

  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const tab = tabs.find((t) => t.id === activeTabId) ?? null;

  const refresh = () => listConnections().then(store.setConnections);
  useEffect(() => { refresh(); }, []);

  const patch = (id: string, p: Partial<Tab>) =>
    setTabs((ts) => ts.map((t) => (t.id === id ? { ...t, ...p } : t)));

  // 点击保留区(结果行 / 行详情)以外的地方,收起行详情。
  // 用捕获阶段,避免 CodeMirror 等内部 stopPropagation 导致监听不触发。
  useEffect(() => {
    const id = tab?.id;
    if (!id || tab?.selectedRow == null) return;
    const onDocClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && !el.closest("[data-keep-sel]")) {
        patch(id, { selectedRow: null });
        rightRef.current?.collapse();
      }
    };
    window.addEventListener("mousedown", onDocClick, true);
    return () => window.removeEventListener("mousedown", onDocClick, true);
  }, [tab?.id, tab?.selectedRow]);

  const tabConn = connections.find((c) => c.id === tab?.connId) ?? null;
  const headConn = tabConn ?? connections.find((c) => c.id === activeId) ?? null;
  const pkCol = tab?.detail?.columns.find((c) => c.isPk)?.name ?? null;
  const dirtyKeys = new Set(Object.keys(tab?.dirty ?? {}));
  const canNext = !!tab && tab.browseTable !== null && tab.result !== null && tab.result.rows.length === PAGE_SIZE;
  const canPrev = !!tab && tab.browseTable !== null && tab.page > 0;

  const onActivate = async (id: string) => {
    store.activate(id);
    const conn = connections.find((c) => c.id === id);
    try {
      if (conn?.kind === "redis") { await redisConnect(id); setTables(await redisScan(id, "*")); }
      else { const r = relApi(conn?.kind ?? "pg"); await r.connect(id); setTables(await r.list(id)); }
    } catch { setTables([]); }
  };

  const onPickConn = async (id: string) => {
    if (id === activeId) { setTreeOpen((o) => !o); return; }
    setTreeOpen(true);
    await onActivate(id);
  };

  const toggleRight = () => {
    const p = rightRef.current;
    if (!p) return;
    if (p.isCollapsed()) p.expand(); else p.collapse();
  };

  // 点表:每次都新开一个 tab
  // 点表/key:每次都新开一个 tab(按连接类型分别处理)
  const onSelectTable = async (t: string) => {
    if (!activeId) return;
    setDdl(null);
    const kind: DbKind = connections.find((c) => c.id === activeId)?.kind ?? "pg";
    const id = crypto.randomUUID();
    if (kind === "redis") {
      const fresh: Tab = {
        id, connId: activeId, kind, title: t, table: t, sql: "",
        result: null, detail: null, redisDetail: null, page: 0, browseTable: null, dirty: {}, err: null, selectedRow: null, resultIsQuery: true, sort: null,
      };
      setTabs((ts) => [...ts, fresh]);
      setActiveTabId(id);
      try {
        const kv = await redisGetKey(activeId, t);
        const redisDetail = await redisKeyDetail(activeId, t);
        patch(id, { result: { columns: kv.columns, rows: kv.rows, affected: null }, redisDetail });
      } catch (e) { patch(id, { err: JSON.stringify(e) }); }
    } else {
      const r = relApi(kind);
      const sql = pageSql(t, 0, kind);
      const fresh: Tab = {
        id, connId: activeId, kind, title: t, table: t, sql,
        result: null, detail: null, redisDetail: null, page: 0, browseTable: t, dirty: {}, err: null, selectedRow: null, resultIsQuery: true, sort: null,
      };
      setTabs((ts) => [...ts, fresh]);
      setActiveTabId(id);
      try {
        const result = await r.query(activeId, sql);
        const detail = await r.detail(activeId, t);
        patch(id, { result, detail });
      } catch (e) { patch(id, { err: JSON.stringify(e) }); }
    }
  };

  const gotoPage = async (p: number) => {
    if (!tab || tab.browseTable === null || p < 0) return;
    const sql = pageSql(tab.browseTable, p, tab.kind, tab.sort);
    try {
      const result = await relApi(tab.kind).query(tab.connId, sql);
      patch(tab.id, { page: p, sql, result, err: null, selectedRow: null, resultIsQuery: true });
    } catch (e) { patch(tab.id, { err: JSON.stringify(e) }); }
  };

  // 点击表头循环排序:无 → 倒序(DESC) → 升序(ASC) → 无;每次按新排序重查第一页
  const cycleSort = async (col: string) => {
    if (!tab || tab.browseTable === null) return;
    const cur = tab.sort;
    const next: SortState =
      !cur || cur.col !== col ? { col, dir: "desc" }
      : cur.dir === "desc" ? { col, dir: "asc" }
      : null;
    const sql = pageSql(tab.browseTable, 0, tab.kind, next);
    try {
      const result = await relApi(tab.kind).query(tab.connId, sql);
      patch(tab.id, { sort: next, page: 0, sql, result, err: null, selectedRow: null, resultIsQuery: true });
    } catch (e) { patch(tab.id, { err: JSON.stringify(e) }); }
  };

  const runSql = async () => {
    if (!tab) return;
    if (tab.kind === "redis") {
      const cmd = (selectionText() || tab.sql).trim();
      if (!cmd) { patch(tab.id, { err: "命令为空" }); return; }
      try {
        const reply = await redisExec(tab.connId, cmd);
        patch(tab.id, { result: { columns: ["结果"], rows: reply ? reply.split("\n").map((l) => [l]) : [], affected: null }, err: null, selectedRow: null });
      } catch (e) { patch(tab.id, { result: null, err: JSON.stringify(e) }); }
      return;
    }
    const q = sqlToRun();
    if (!q.trim()) { patch(tab.id, { err: "SQL 为空" }); return; }
    try {
      const result = await relApi(tab.kind).query(tab.connId, q);
      patch(tab.id, { result, err: null, browseTable: null, page: 0, selectedRow: null, resultIsQuery: isQuery(q), sort: null });
    } catch (e) { patch(tab.id, { result: null, err: JSON.stringify(e) }); }
  };

  // EXPLAIN 当前/选中的 SQL(PG / MySQL / SQLite;纯 EXPLAIN 不执行查询)
  const explain = async () => {
    if (!tab || tab.kind === "redis") return;
    const q = sqlToRun();
    if (!q.trim()) { patch(tab.id, { err: "SQL 为空" }); return; }
    try {
      const result = await relApi(tab.kind).query(tab.connId, `EXPLAIN ${q}`);
      patch(tab.id, { result, err: null, browseTable: null, page: 0, selectedRow: null, resultIsQuery: true, sort: null });
    } catch (e) { patch(tab.id, { result: null, err: JSON.stringify(e) }); }
  };

  const stageEdit = (e: Omit<CellEdit, "table">) => {
    if (!tab) return;
    const key = `${e.pkValue}|${e.column}`;
    patch(tab.id, { dirty: { ...tab.dirty, [key]: { ...e, table: tab.table ?? "" } } });
  };

  const commit = async () => {
    if (!tab || !tab.table) return;
    const edits = Object.values(tab.dirty);
    if (edits.length === 0) return;
    try {
      const r = relApi(tab.kind);
      await r.commit(tab.connId, edits.map((e) => ({ ...e, table: tab.table! })));
      const sql = tab.browseTable ? pageSql(tab.browseTable, tab.page, tab.kind, tab.sort) : tab.sql;
      const result = await r.query(tab.connId, sql);
      patch(tab.id, { dirty: {}, result, sql, err: null, resultIsQuery: true });
    } catch (e) { patch(tab.id, { err: JSON.stringify(e) }); }
  };

  // 刷新左侧表/KEY 列表
  const refreshTables = async () => {
    if (!activeId) return;
    const conn = connections.find((c) => c.id === activeId);
    try {
      if (conn?.kind === "redis") setTables(await redisScan(activeId, "*"));
      else setTables(await relApi(conn?.kind ?? "pg").list(activeId));
    } catch { /* 忽略 */ }
  };

  // 刷新当前 tab 的结构与结果
  const refreshTab = async () => {
    if (!tab || !tab.table) return;
    if (tab.kind === "redis") {
      try {
        const kv = await redisGetKey(tab.connId, tab.table);
        const redisDetail = await redisKeyDetail(tab.connId, tab.table);
        patch(tab.id, { result: { columns: kv.columns, rows: kv.rows, affected: null }, redisDetail, err: null, resultIsQuery: true });
      } catch (e) { patch(tab.id, { err: JSON.stringify(e) }); }
      return;
    }
    const r = relApi(tab.kind);
    try {
      const detail = await r.detail(tab.connId, tab.table);
      const sql = tab.browseTable ? pageSql(tab.browseTable, tab.page, tab.kind, tab.sort) : tab.sql;
      const result = await r.query(tab.connId, sql);
      patch(tab.id, { detail, result, err: null, selectedRow: null, resultIsQuery: true });
    } catch (e) { patch(tab.id, { err: JSON.stringify(e) }); }
  };

  const onRefresh = () => { refreshTables(); refreshTab(); toast.success("已刷新"); };

  const closeTab = (id: string) => {
    const idx = tabs.findIndex((t) => t.id === id);
    const next = tabs.filter((t) => t.id !== id);
    setTabs(next);
    if (activeTabId === id) {
      const neighbor = next[idx] ?? next[idx - 1] ?? null;
      setActiveTabId(neighbor ? neighbor.id : null);
    }
  };

  // 关闭除指定页外的所有标签页,并将其设为当前页
  const closeOtherTabs = (id: string) => {
    setTabs((ts) => ts.filter((t) => t.id === id));
    setActiveTabId(id);
  };

  // ⌘W:有打开的 tab 则关闭当前 tab;否则退出程序
  // (⌘R 重载在 main.tsx 全局注册,确保 App 崩溃卸载后仍可用于从白屏恢复)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "w") {
        e.preventDefault();
        if (activeTabId) closeTab(activeTabId);
        else getCurrentWindow().close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTabId, tabs]);

  // ⌘R:刷新表/KEY 列表与当前 tab(拦截 webview 默认刷新)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "r") {
        e.preventDefault();
        onRefresh();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, tab, connections]);

  const openNew = () => { setEditConn(null); setFormOpen(true); };
  const openEdit = (c: Connection) => { setEditConn(c); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditConn(null); };

  const onSubmit = async (conn: Connection, pw: string) => {
    const password = editConn ? (pw === "" ? undefined : pw) : pw;
    await saveConnection(conn, password);
    closeForm(); refresh();
  };

  const confirmDelete = async () => {
    if (!confirmDel) return;
    const delId = confirmDel.id;
    await deleteConnection(delId);
    const next = tabs.filter((t) => t.connId !== delId);
    setTabs(next);
    if (!next.find((t) => t.id === activeTabId)) setActiveTabId(next[0]?.id ?? null);
    setConfirmDel(null);
    refresh();
  };

  // 查看建表语句:取该表详情,合成 DDL,弹出锚定在表名旁的浮层
  const showDdl = async (table: string, x: number, y: number) => {
    if (!activeId) return;
    const kind = connections.find((c) => c.id === activeId)?.kind ?? "pg";
    try {
      if (kind === "mysql") {
        const r = await myQuery(activeId, `SHOW CREATE TABLE \`${table.replace(/`/g, "``")}\``);
        setDdl({ table, sql: r.rows[0]?.[1] ?? "", x, y });
      } else {
        const detail = await relApi(kind).detail(activeId, table);
        setDdl({ table, sql: buildCreateTable(table, detail), x, y });
      }
    } catch { /* 忽略 */ }
  };

  // 复制当前表的 INSERT 模板
  const copyInsert = () => {
    if (tab?.detail && tab.table) copyWithToast(buildInsert(tab.table, tab.detail, relApi(tab.kind).dialect));
  };

  // 复制结果某一行的 INSERT(真实值)
  const copyInsertRow = (rowIndex: number) => {
    if (!tab?.result) return;
    const row = tab.result.rows[rowIndex];
    if (!row) return;
    copyWithToast(buildInsertRow(tab.table ?? "table", tab.result.columns, row, relApi(tab.kind).dialect));
  };

  return (
    <div style={{ height: "100vh" }}>
      <PanelGroup direction="horizontal" autoSaveId="dbstudio-cols">
        {/* 左栏 */}
        <Panel defaultSize={18} minSize={10}>
          <aside style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg-panel)", overflow: "hidden" }}>
            <div style={{ padding: 8, display: "flex", justifyContent: "space-between", flexShrink: 0 }}>
              <span style={{ color: "var(--fg-muted)", fontSize: 10 }}>连接</span>
              <button onClick={openNew} title="新建连接">＋</button>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
              <ConnectionList
                connections={connections}
                activeId={activeId}
                expandedId={treeOpen ? activeId : null}
                onPick={onPickConn}
                onEdit={openEdit}
                onContext={(c, x, y) => setMenu({ c, x, y })}
                renderUnder={(c) =>
                  c.id === activeId && treeOpen
                    ? <ObjectTree tables={tables} active={tab?.table ?? null} contextTable={tableMenu?.table ?? null}
                        onSelect={onSelectTable}
                        onContext={(table, x, y) => setTableMenu({ table, x, y })} />
                    : null}
              />
            </div>
            <div style={{ padding: 8, flexShrink: 0, borderTop: "1px solid var(--border)" }}>
              <button onClick={toggle} title="切换主题"
                style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer", padding: "4px 10px", fontSize: 15 }}>
                {name === "light" ? "🌙" : "☀️"}
              </button>
            </div>
          </aside>
        </Panel>

        <HHandle />

        {/* 中栏 */}
        <Panel defaultSize={58} minSize={25}>
          <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {/* 连接信息条 + 右栏开关 */}
            <div style={{ padding: "5px 10px", fontSize: 12, borderBottom: "1px solid var(--border)", background: "var(--bg-panel)", color: headConn ? "var(--fg)" : "var(--fg-muted)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {headConn
                  ? <>🔌 {headConn.name} · 库 <b>{headConn.kind === "sqlite" ? (headConn.filePath?.split(/[/\\]/).pop() || headConn.filePath || "—") : headConn.database}</b>{tab?.table ? ` · ${tab.kind === "redis" ? "key" : "表"} ${tab.table}` : ""}</>
                  : "未连接 —— 点左侧连接"}
              </span>
              <button onClick={toggleRight} title={rightOpen ? "隐藏详情栏" : "显示详情栏"}
                style={{ flexShrink: 0, background: "transparent", border: "1px solid var(--border)", borderRadius: 4, color: "var(--fg-muted)", cursor: "pointer", padding: "1px 8px", fontSize: 14, lineHeight: 1.4 }}>
                {rightOpen ? "»" : "«"}
              </button>
            </div>

            {/* 标签页栏 */}
            <div style={{ display: "flex", alignItems: "stretch", overflowX: "auto", background: "var(--bg-panel)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
              {tabs.map((t) => (
                <div key={t.id}
                     onClick={() => setActiveTabId(t.id)}
                     onContextMenu={(e) => { e.preventDefault(); setTabMenu({ id: t.id, x: e.clientX, y: e.clientY }); }}
                     title={t.title}
                     style={{
                       display: "flex", alignItems: "center", gap: 6, padding: "4px 8px",
                       cursor: "pointer", fontSize: 12, whiteSpace: "nowrap",
                       borderRight: "1px solid var(--border)",
                       background: t.id === activeTabId ? "var(--bg)" : "transparent",
                       borderTop: t.id === activeTabId ? "2px solid var(--accent)" : "2px solid transparent",
                     }}>
                  <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</span>
                  <span onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}
                        title="关闭" style={{ color: "var(--fg-muted)", padding: "0 2px" }}>✕</span>
                </div>
              ))}
            </div>

            {tab ? (
              <div style={{ flex: 1, minHeight: 0 }}>
                <PanelGroup direction="vertical" autoSaveId="dbstudio-mid">
                  <Panel defaultSize={40} minSize={12}>
                    <SqlEditor value={tab.sql} onChange={(v) => patch(tab.id, { sql: v })} onRun={runSql} dark={name === "mirage"} onView={(v) => { viewRef.current = v; }} />
                  </Panel>

                  <VHandle />

                  <Panel defaultSize={60} minSize={15}>
                    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                      {/* 结果状态条 + 运行按钮(右上) */}
                      <div style={{ padding: "4px 10px", fontSize: 11, color: "var(--fg-muted)", borderBottom: "1px solid var(--border)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <span>
                          {tab.err ? <span style={{ color: "var(--error)" }}>查询出错</span>
                            : tab.result ? (!tab.resultIsQuery
                                ? `执行成功${tab.result.affected ? ` · 影响 ${tab.result.affected} 行` : ""}`
                                : `${tab.result.rows.length} 行 · ${tab.result.columns.length} 列${tab.result.affected ? ` · 影响 ${tab.result.affected}` : ""}`)
                            : "就绪"}
                        </span>
                        <span style={{ flexShrink: 0, display: "flex", gap: 6 }}>
                          {tab.kind !== "redis" && (
                            <button onClick={explain} title="查看执行计划(EXPLAIN)"
                              style={{ background: "transparent", color: "var(--fg-muted)", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 10px", fontSize: 11, cursor: "pointer" }}>
                              Explain
                            </button>
                          )}
                          <button onClick={runSql} title="运行 (⌘↵)"
                            style={{ background: "var(--accent)", color: "#fff", border: 0, borderRadius: 4, padding: "2px 12px", fontSize: 11, cursor: "pointer" }}>
                            ▶ 运行 ⌘↵
                          </button>
                        </span>
                      </div>
                      {/* 结果滚动区 */}
                      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                        {tab.err && <div style={{ color: "var(--error)", padding: 8, fontSize: 12, whiteSpace: "pre-wrap" }}>{tab.err}</div>}
                        {!tab.err && tab.result && tab.result.rows.length === 0 && (
                          !tab.resultIsQuery
                            ? <div style={{ padding: 8, color: "var(--accent)", fontSize: 12 }}>✓ 执行成功{tab.result.affected ? ` · 影响 ${tab.result.affected} 行` : ""}</div>
                            : <div style={{ padding: 8, color: "var(--fg-muted)", fontSize: 12 }}>查询成功,但没有行(0 行)</div>
                        )}
                        {!tab.err && tab.result && tab.result.rows.length > 0 &&
                          <ResultGrid result={tab.result} pkCol={pkCol} dirtyKeys={dirtyKeys}
                            onStage={stageEdit} onCommit={commit}
                            selectedRow={tab.selectedRow}
                            sort={tab.sort}
                            onSortColumn={tab.browseTable ? cycleSort : undefined}
                            onSelectRow={(i) => { patch(tab.id, { selectedRow: i }); rightRef.current?.expand(); }}
                            onCopyInsertRow={(i) => copyInsertRow(i)} />}
                      </div>
                      {/* 分页(右下) */}
                      {tab.browseTable && (
                        <div style={{ flexShrink: 0, borderTop: "1px solid var(--border)", padding: "4px 10px", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, fontSize: 12 }}>
                          <span style={{ color: "var(--fg-muted)" }}>第 {tab.page + 1} 页 · 每页 {PAGE_SIZE}</span>
                          <button disabled={!canPrev} onClick={() => gotoPage(tab.page - 1)} title="上一页">←</button>
                          <button disabled={!canNext} onClick={() => gotoPage(tab.page + 1)} title="下一页">→</button>
                        </div>
                      )}
                    </div>
                  </Panel>
                </PanelGroup>
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)", fontSize: 13 }}>
                点左侧的表打开一个标签页
              </div>
            )}
          </div>
        </Panel>

        <HHandle />

        {/* 右栏:表详情(可折叠) */}
        <Panel ref={rightRef} collapsible collapsedSize={0} defaultSize={24} minSize={12}
          onCollapse={() => setRightOpen(false)} onExpand={() => setRightOpen(true)}>
          <aside style={{ height: "100%", overflow: "auto", background: "var(--bg-panel)" }}>
            {tab?.result && tab.selectedRow != null && tab.result.rows[tab.selectedRow] ? (
              <RowDetail
                columns={tab.result.columns}
                values={tab.result.rows[tab.selectedRow]}
                types={tab.detail ? Object.fromEntries(tab.detail.columns.map((c) => [c.name, c.dataType])) : {}}
                onBack={() => patch(tab.id, { selectedRow: null })}
              />
            ) : tab?.kind === "redis" && tab.redisDetail ? (
              <div style={{ padding: 10, fontSize: 12, lineHeight: 2 }}>
                <div style={{ color: "var(--fg-muted)", fontSize: 10, textTransform: "uppercase", marginBottom: 6 }}>KEY 详情</div>
                <div style={{ wordBreak: "break-all" }}><span style={{ color: "var(--fg-muted)" }}>键</span> <b>{tab.redisDetail.key}</b></div>
                <div><span style={{ color: "var(--fg-muted)" }}>类型</span> <span style={{ color: "var(--syn-type)" }}>{tab.redisDetail.keyType}</span></div>
                <div><span style={{ color: "var(--fg-muted)" }}>TTL</span> {tab.redisDetail.ttl === -1 ? "永不过期" : tab.redisDetail.ttl === -2 ? "不存在" : `${tab.redisDetail.ttl}s`}</div>
                <div><span style={{ color: "var(--fg-muted)" }}>大小</span> {tab.redisDetail.size}</div>
              </div>
            ) : tab?.detail && tab.table ? (
              <TableDetail detail={tab.detail} table={tab.table}
                onColContext={(x, y) => setColMenu({ x, y })} />
            ) : (
              <div style={{ padding: 8, color: "var(--fg-muted)", fontSize: 10 }}>详情</div>
            )}
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
          />
        </Modal>
      )}

      {/* 右键连接 */}
      {menu && (
        <ContextMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)} items={[
          { label: "编辑", onClick: () => openEdit(menu.c) },
          { label: "删除", danger: true, onClick: () => setConfirmDel(menu.c) },
        ]} />
      )}

      {/* 右键表 / key */}
      {tableMenu && (
        <ContextMenu x={tableMenu.x} y={tableMenu.y} onClose={() => setTableMenu(null)}
          items={
            connections.find((c) => c.id === activeId)?.kind === "redis"
              ? [{ label: "复制 key 名", onClick: () => copyWithToast(tableMenu.table) }]
              : [
                  { label: "复制表名", onClick: () => copyWithToast(tableMenu.table) },
                  { label: "查看建表语句", onClick: () => showDdl(tableMenu.table, tableMenu.x, tableMenu.y) },
                ]
          } />
      )}

      {/* 右键标签页 */}
      {tabMenu && (
        <ContextMenu x={tabMenu.x} y={tabMenu.y} onClose={() => setTabMenu(null)} items={[
          { label: "关闭标签页", onClick: () => closeTab(tabMenu.id) },
          { label: "关闭其他标签页", onClick: () => closeOtherTabs(tabMenu.id) },
        ]} />
      )}

      {/* 右键结构字段 */}
      {colMenu && (
        <ContextMenu x={colMenu.x} y={colMenu.y} onClose={() => setColMenu(null)} items={[
          { label: "复制 INSERT 语句", onClick: copyInsert },
        ]} />
      )}

      {/* 建表语句浮层:位置自适应,小箭头指向左侧表名 */}
      {ddl && (() => {
        const M = 12;
        const W = Math.min(560, window.innerWidth * 0.7);
        const H = Math.min(window.innerHeight * 0.55, window.innerHeight - 2 * M);
        let left = ddl.x + 8;
        left = Math.max(M, Math.min(left, window.innerWidth - W - M));
        let top = ddl.y - 20;
        top = Math.max(M, Math.min(top, window.innerHeight - H - M));
        const arrowTop = Math.max(10, Math.min(ddl.y - top - 8, H - 24)); // 箭头跟随锚点
        return (
          <>
            <div onClick={() => setDdl(null)} style={{ position: "fixed", inset: 0, zIndex: 150 }} />
            <div style={{
              position: "fixed", left, top, width: W, height: H, zIndex: 151,
              background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10,
              boxShadow: "0 8px 32px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column",
            }}>
              {/* 箭头(描边 + 填充两层三角) */}
              <div style={{ position: "absolute", left: -8, top: arrowTop, width: 0, height: 0,
                borderTop: "8px solid transparent", borderBottom: "8px solid transparent",
                borderRight: "8px solid var(--border)" }} />
              <div style={{ position: "absolute", left: -7, top: arrowTop, width: 0, height: 0,
                borderTop: "8px solid transparent", borderBottom: "8px solid transparent",
                borderRight: "8px solid var(--bg)" }} />
              <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>建表语句 · <b style={{ color: "var(--fg)" }}>{ddl.table}</b></span>
                <span style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => copyWithToast(ddl.sql)} title="复制全部"
                    style={{ background: "var(--accent)", color: "#fff", border: 0, borderRadius: 8, padding: "4px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>复制</button>
                  <button onClick={() => setDdl(null)} title="关闭"
                    style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontSize: 12, color: "var(--fg-muted)" }}>关闭</button>
                </span>
              </div>
              <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                <SqlView value={ddl.sql} dark={name === "mirage"} />
              </div>
            </div>
          </>
        );
      })()}

      {/* 删除二次确认 */}
      {confirmDel && (
        <Modal onClose={() => setConfirmDel(null)}>
          <div style={{ padding: 20, display: "grid", gap: 14, minWidth: 320 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)" }}>删除连接</div>
            <div style={{ fontSize: 13, color: "var(--fg)" }}>
              确定删除连接「<b>{confirmDel.name}</b>」?
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
              此操作不可撤销{confirmDel.env !== "local" ? ",并会清除钥匙串中保存的密码" : ""}。
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDel(null)}
                style={{ background: "transparent", color: "var(--fg-muted)", border: "1px solid var(--border)", borderRadius: 12, padding: "9px 18px", cursor: "pointer" }}>
                取消
              </button>
              <button onClick={confirmDelete}
                style={{ background: "var(--error)", color: "#fff", border: 0, borderRadius: 12, padding: "9px 18px", cursor: "pointer", fontWeight: 600 }}>
                删除
              </button>
            </div>
          </div>
        </Modal>
      )}

      <Toaster />
    </div>
  );
}
