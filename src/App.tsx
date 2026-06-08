import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { useTheme } from "./theme/ThemeProvider";
import { useStore } from "./state/store";
import { listConnections, saveConnection, deleteConnection } from "./api/connections";
import { pgConnect, pgListObjects, pgQuery, pgTableDetail, pgCommitEdits } from "./api/pg";
import type { QueryResult, TableDetail as Detail, CellEdit } from "./api/pg";
import { Modal } from "./components/Modal";
import { ContextMenu } from "./components/ContextMenu";
import { buildCreateTable, buildInsert } from "./lib/sqlgen";
import { copyToClipboard } from "./lib/clipboard";
import { ConnectionList } from "./components/Sidebar/ConnectionList";
import { ConnectionForm } from "./components/Sidebar/ConnectionForm";
import { ObjectTree } from "./components/Sidebar/ObjectTree";
import { SqlEditor } from "./components/editor/SqlEditor";
import { ResultGrid } from "./components/results/ResultGrid";
import { TableDetail } from "./components/detail/TableDetail";
import type { Connection } from "./types";

const PAGE_SIZE = 100;

/** 一个工作标签页:绑定连接,持有各自的 SQL / 结果 / 分页 / 暂存编辑 */
interface Tab {
  id: string;
  connId: string;
  title: string;
  table: string | null;       // 编辑目标表(点表打开时)
  sql: string;
  result: QueryResult | null;
  detail: Detail | null;
  page: number;
  browseTable: string | null; // 非空表示处于分页浏览
  dirty: Record<string, CellEdit>;
  err: string | null;
}

function HHandle() {
  return <PanelResizeHandle style={{ width: 5, background: "var(--border)", cursor: "col-resize" }} />;
}
function VHandle() {
  return <PanelResizeHandle style={{ height: 5, background: "var(--border)", cursor: "row-resize" }} />;
}

const pageSql = (t: string, p: number) => `SELECT * FROM "${t}" LIMIT ${PAGE_SIZE} OFFSET ${p * PAGE_SIZE}`;

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
  const [menu, setMenu] = useState<{ c: Connection; x: number; y: number } | null>(null);
  const [confirmDel, setConfirmDel] = useState<Connection | null>(null);
  const [tableMenu, setTableMenu] = useState<{ table: string; x: number; y: number } | null>(null);
  const [colMenu, setColMenu] = useState<{ x: number; y: number } | null>(null);
  const [ddl, setDdl] = useState<{ table: string; sql: string } | null>(null);

  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const tab = tabs.find((t) => t.id === activeTabId) ?? null;

  const refresh = () => listConnections().then(store.setConnections);
  useEffect(() => { refresh(); }, []);

  const patch = (id: string, p: Partial<Tab>) =>
    setTabs((ts) => ts.map((t) => (t.id === id ? { ...t, ...p } : t)));

  const tabConn = connections.find((c) => c.id === tab?.connId) ?? null;
  const headConn = tabConn ?? connections.find((c) => c.id === activeId) ?? null;
  const pkCol = tab?.detail?.columns.find((c) => c.isPk)?.name ?? null;
  const dirtyKeys = new Set(Object.keys(tab?.dirty ?? {}));
  const canNext = !!tab && tab.browseTable !== null && tab.result !== null && tab.result.rows.length === PAGE_SIZE;
  const canPrev = !!tab && tab.browseTable !== null && tab.page > 0;

  const onActivate = async (id: string) => {
    store.activate(id);
    try { await pgConnect(id); setTables(await pgListObjects(id)); }
    catch { setTables([]); }
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
  const onSelectTable = async (t: string) => {
    if (!activeId) return;
    setDdl(null);
    const id = crypto.randomUUID();
    const sql = pageSql(t, 0);
    const fresh: Tab = {
      id, connId: activeId, title: t, table: t, sql,
      result: null, detail: null, page: 0, browseTable: t, dirty: {}, err: null,
    };
    setTabs((ts) => [...ts, fresh]);
    setActiveTabId(id);
    try {
      const result = await pgQuery(activeId, sql);
      const detail = await pgTableDetail(activeId, t);
      patch(id, { result, detail });
    } catch (e) { patch(id, { err: JSON.stringify(e) }); }
  };

  const gotoPage = async (p: number) => {
    if (!tab || tab.browseTable === null || p < 0) return;
    const sql = pageSql(tab.browseTable, p);
    try {
      const result = await pgQuery(tab.connId, sql);
      patch(tab.id, { page: p, sql, result, err: null });
    } catch (e) { patch(tab.id, { err: JSON.stringify(e) }); }
  };

  const runSql = async () => {
    if (!tab) return;
    if (!tab.sql.trim()) { patch(tab.id, { err: "SQL 为空" }); return; }
    try {
      const result = await pgQuery(tab.connId, tab.sql);
      patch(tab.id, { result, err: null, browseTable: null, page: 0 });
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
      await pgCommitEdits(tab.connId, edits.map((e) => ({ ...e, table: tab.table! })));
      const sql = tab.browseTable ? pageSql(tab.browseTable, tab.page) : tab.sql;
      const result = await pgQuery(tab.connId, sql);
      patch(tab.id, { dirty: {}, result, sql, err: null });
    } catch (e) { patch(tab.id, { err: JSON.stringify(e) }); }
  };

  const closeTab = (id: string) => {
    const idx = tabs.findIndex((t) => t.id === id);
    const next = tabs.filter((t) => t.id !== id);
    setTabs(next);
    if (activeTabId === id) {
      const neighbor = next[idx] ?? next[idx - 1] ?? null;
      setActiveTabId(neighbor ? neighbor.id : null);
    }
  };

  // ⌘W:有打开的 tab 则关闭当前 tab;否则退出程序
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

  // 查看建表语句:取该表详情,合成 DDL 显示在右栏
  const showDdl = async (table: string) => {
    if (!activeId) return;
    try {
      const detail = await pgTableDetail(activeId, table);
      setDdl({ table, sql: buildCreateTable(table, detail) });
      rightRef.current?.expand();
    } catch { /* 忽略 */ }
  };

  // 复制当前表的 INSERT 模板
  const copyInsert = () => {
    if (tab?.detail && tab.table) copyToClipboard(buildInsert(tab.table, tab.detail));
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
                    ? <ObjectTree tables={tables} active={tab?.table ?? null} onSelect={onSelectTable}
                        onContext={(table, x, y) => setTableMenu({ table, x, y })} />
                    : null}
              />
            </div>
            <div style={{ padding: 8, flexShrink: 0, borderTop: "1px solid var(--border)" }}>
              <button onClick={toggle} title="切换主题"
                style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer", padding: "4px 10px", fontSize: 15 }}>
                {name === "light" ? "☀️" : "🌙"}
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
                  ? <>🔌 {headConn.name} · 库 <b>{headConn.database}</b>{tab?.table ? ` · 表 ${tab.table}` : ""}</>
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
                    <SqlEditor value={tab.sql} onChange={(v) => patch(tab.id, { sql: v })} onRun={runSql} dark={name === "mirage"} />
                  </Panel>

                  <VHandle />

                  <Panel defaultSize={60} minSize={15}>
                    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                      {/* 结果状态条 + 运行按钮(右上) */}
                      <div style={{ padding: "4px 10px", fontSize: 11, color: "var(--fg-muted)", borderBottom: "1px solid var(--border)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <span>
                          {tab.err ? <span style={{ color: "var(--error)" }}>查询出错</span>
                            : tab.result ? `${tab.result.rows.length} 行 · ${tab.result.columns.length} 列${tab.result.affected != null ? ` · 影响 ${tab.result.affected}` : ""}`
                            : "就绪"}
                        </span>
                        <button onClick={runSql} title="运行 (⌘↵)"
                          style={{ flexShrink: 0, background: "var(--accent)", color: "#fff", border: 0, borderRadius: 4, padding: "2px 12px", fontSize: 11, cursor: "pointer" }}>
                          ▶ 运行 ⌘↵
                        </button>
                      </div>
                      {/* 结果滚动区 */}
                      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                        {tab.err && <div style={{ color: "var(--error)", padding: 8, fontSize: 12, whiteSpace: "pre-wrap" }}>{tab.err}</div>}
                        {!tab.err && tab.result && tab.result.rows.length === 0 &&
                          <div style={{ padding: 8, color: "var(--fg-muted)", fontSize: 12 }}>查询成功,但没有行(0 行)</div>}
                        {!tab.err && tab.result && tab.result.rows.length > 0 &&
                          <ResultGrid result={tab.result} pkCol={pkCol} dirtyKeys={dirtyKeys}
                            onStage={stageEdit} onCommit={commit} />}
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
          <aside style={{ height: "100%", overflow: "hidden", background: "var(--bg-panel)", display: "flex", flexDirection: "column" }}>
            {ddl ? (
              <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>建表语句 · <b style={{ color: "var(--fg)" }}>{ddl.table}</b></span>
                  <span style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => copyToClipboard(ddl.sql)} title="复制全部"
                      style={{ background: "var(--accent)", color: "#fff", border: 0, borderRadius: 8, padding: "3px 10px", cursor: "pointer", fontSize: 11 }}>复制</button>
                    <button onClick={() => setDdl(null)} title="关闭"
                      style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "3px 8px", cursor: "pointer", fontSize: 11, color: "var(--fg-muted)" }}>关闭</button>
                  </span>
                </div>
                <textarea readOnly value={ddl.sql} spellCheck={false}
                  style={{ flex: 1, minHeight: 0, border: 0, borderRadius: 0, resize: "none",
                           fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12,
                           padding: 10, background: "var(--bg)", color: "var(--fg)" }} />
              </div>
            ) : tab?.detail && tab.table ? (
              <div style={{ overflow: "auto", height: "100%" }}>
                <TableDetail detail={tab.detail} table={tab.table}
                  onColContext={(x, y) => setColMenu({ x, y })} />
              </div>
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

      {/* 右键表 */}
      {tableMenu && (
        <ContextMenu x={tableMenu.x} y={tableMenu.y} onClose={() => setTableMenu(null)} items={[
          { label: "查看建表语句", onClick: () => showDdl(tableMenu.table) },
        ]} />
      )}

      {/* 右键结构字段 */}
      {colMenu && (
        <ContextMenu x={colMenu.x} y={colMenu.y} onClose={() => setColMenu(null)} items={[
          { label: "复制 INSERT 语句", onClick: copyInsert },
        ]} />
      )}

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
    </div>
  );
}
