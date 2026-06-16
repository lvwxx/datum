import { useEffect, useRef, useState } from "react";
import type { QueryResult, CellEdit } from "../../api/pg";
import { Modal } from "../Modal";
import { ContextMenu } from "../ContextMenu";
import { copyToClipboard } from "../../lib/clipboard";
import { toast } from "../Toast";

const DEFAULT_W = 160;
const MIN_W = 48;

export function ResultGrid(props: {
  result: QueryResult;
  pkCol: string | null;
  dirtyKeys: Set<string>;
  onStage: (e: Omit<CellEdit, "table">) => void;
  onCommit: () => void;
  onCopyInsertRow?: (rowIndex: number) => void;
  selectedRow?: number | null;
  onSelectRow?: (rowIndex: number) => void;
  sort?: { col: string; dir: "asc" | "desc" } | null;
  onSortColumn?: (col: string) => void; // 仅浏览表时提供:点击表头按该字段重查排序
}) {
  const { columns, rows } = props.result;
  const pkIndex = props.pkCol ? columns.indexOf(props.pkCol) : -1;
  const editable = pkIndex >= 0;
  const selectedRow = props.selectedRow ?? null;
  const [cell, setCell] = useState<{ r: number; c: number } | null>(null);
  const [draft, setDraft] = useState("");
  const [menu, setMenu] = useState<{ r: number; c: number; x: number; y: number } | null>(null);
  const [widths, setWidths] = useState<Record<number, number>>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);

  // 结果列集变化(切表/换查询)时重置列宽
  useEffect(() => { setWidths({}); }, [columns.join("|")]);

  // 跟随结果区(滚动容器)宽度变化
  useEffect(() => {
    const el = rootRef.current?.parentElement;
    if (!el) return;
    setContainerW(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setContainerW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 单列结果(如 EXPLAIN)默认占容器宽度的 50%,其余 160
  const defaultW = () =>
    columns.length === 1 && containerW > 0 ? Math.max(DEFAULT_W, Math.floor(containerW * 0.5)) : DEFAULT_W;
  const colWidth = (i: number) => widths[i] ?? defaultW();
  const stripe = (ri: number) => (ri % 2 === 1 ? "var(--bg-panel)" : "transparent");
  const totalWidth = columns.reduce((s, _c, i) => s + colWidth(i), 0);
  const fill = Math.max(0, containerW - totalWidth); // 不足整宽时用空白列补满

  const startResize = (i: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = colWidth(i);
    const onMove = (ev: MouseEvent) => {
      const w = Math.max(MIN_W, startW + (ev.clientX - startX));
      setWidths((m) => ({ ...m, [i]: w }));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const openCell = (r: number, c: number) => { setCell({ r, c }); setDraft(rows[r][c] ?? ""); };
  const applyEdit = () => {
    if (!cell || !editable) return;
    const pkValue = rows[cell.r][pkIndex] ?? "";
    props.onStage({ pkCol: props.pkCol!, pkValue, column: columns[cell.c], newValue: draft });
    setCell(null);
  };

  const thStyle: React.CSSProperties = {
    padding: "4px 6px", fontWeight: 600, color: "var(--fg-muted)", textAlign: "left",
    position: "sticky", top: 0, zIndex: 1, background: "var(--bg-panel)",
    borderRight: "1px solid var(--border)", borderBottom: "2px solid var(--border)",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  };
  const ellipsis: React.CSSProperties = {
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  };

  return (
    <div ref={rootRef} tabIndex={0} data-keep-sel
         onKeyDown={(e) => { if (e.metaKey && e.key.toLowerCase() === "s") { e.preventDefault(); props.onCommit(); } }}
         style={{ outline: "none" }}>
      {props.pkCol === null &&
        <div style={{ color: "var(--fg-muted)", fontSize: 11, padding: "4px 8px" }}>该结果无主键,双击可查看完整内容,暂不可编辑</div>}
      <table style={{ borderCollapse: "collapse", fontSize: 12, tableLayout: "fixed", width: Math.max(totalWidth, containerW) }}>
        <colgroup>
          {columns.map((c, i) => <col key={`${c}-${i}`} style={{ width: colWidth(i) }} />)}
          {fill > 0 && <col style={{ width: fill }} />}
        </colgroup>
        <thead>
          <tr>
            {columns.map((c, i) => {
              const sortable = !!props.onSortColumn;
              const arrow = props.sort?.col === c ? (props.sort.dir === "desc" ? " ↓" : " ↑") : "";
              return (
              <th key={`${c}-${i}`}
                  onClick={sortable ? () => props.onSortColumn!(c) : undefined}
                  title={sortable ? "点击排序(倒序 → 升序 → 取消)" : undefined}
                  style={{ ...thStyle, position: "sticky", cursor: sortable ? "pointer" : "default" }}>
                <span style={ellipsis as React.CSSProperties}>
                  {c}
                  {arrow && <span style={{ color: "var(--accent)", fontWeight: 700 }}>{arrow}</span>}
                </span>
                <span
                  onMouseDown={(e) => startResize(i, e)}
                  onClick={(e) => e.stopPropagation()}
                  title="拖动调整列宽"
                  style={{ position: "absolute", top: 0, right: 0, width: 7, height: "100%", cursor: "col-resize" }}
                />
              </th>
              );
            })}
            {fill > 0 && <th style={{ ...thStyle, position: "sticky", borderRight: "none" }} />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const selected = selectedRow === ri;
            const rowBg = selected ? "var(--selection)" : stripe(ri);
            return (
              <tr key={ri} onClick={() => props.onSelectRow?.(ri)}>
                {row.map((cellVal, ci) => {
                  const pkValue = pkIndex >= 0 ? row[pkIndex] ?? "" : "";
                  const dirty = props.dirtyKeys.has(`${pkValue}|${columns[ci]}`);
                  const bg = dirty ? "var(--dirty-bg)" : rowBg;
                  return (
                    <td key={ci}
                        onDoubleClick={() => openCell(ri, ci)}
                        onContextMenu={(e) => { e.preventDefault(); props.onSelectRow?.(ri); setMenu({ r: ri, c: ci, x: e.clientX, y: e.clientY }); }}
                        title="双击查看完整内容"
                        style={{
                          padding: 0, background: bg,
                          borderRight: "1px solid var(--border)",
                          borderBottom: "1px solid var(--border)",
                          boxShadow: dirty ? "inset 0 0 0 1px var(--accent)" : undefined,
                        }}>
                      <div style={columns.length === 1
                        ? { padding: "3px 6px", whiteSpace: "pre-wrap", wordBreak: "break-word" }
                        : { ...ellipsis, padding: "3px 6px" }}>
                        {cellVal ?? <span style={{ color: "var(--fg-muted)" }}>NULL</span>}
                      </div>
                    </td>
                  );
                })}
                {fill > 0 && <td style={{ background: rowBg, borderBottom: "1px solid var(--border)" }} />}
              </tr>
            );
          })}
        </tbody>
      </table>

      {cell && (
        <Modal onClose={() => setCell(null)}>
          <div style={{ padding: 14, display: "grid", gap: 10, minWidth: 380, maxWidth: 600 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                列 <b style={{ color: "var(--fg)" }}>{columns[cell.c]}</b>
                {editable ? "" : " · 仅查看(无主键)"}
              </div>
              <button
                onClick={() => { copyToClipboard(draft); toast.success("已复制"); setCell(null); }}
                title="复制当前内容"
                style={{ flexShrink: 0, background: "transparent", color: "var(--fg-muted)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 12px", fontSize: 12, cursor: "pointer" }}>
                复制
              </button>
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              readOnly={!editable}
              spellCheck={false}
              autoFocus
              style={{
                width: "100%", minHeight: 220, boxSizing: "border-box", padding: 10,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13,
                lineHeight: 1.5, resize: "vertical",
                background: "var(--bg)", color: "var(--fg)",
                border: "1px solid var(--border)", borderRadius: 6,
              }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              {editable && (
                <button onClick={applyEdit}
                  style={{ background: "var(--accent)", color: "#fff", border: 0, borderRadius: 4, padding: "5px 14px", cursor: "pointer" }}>
                  暂存修改
                </button>
              )}
              <button onClick={() => setCell(null)} style={{ padding: "5px 14px" }}>关闭</button>
            </div>
          </div>
        </Modal>
      )}

      {menu && (
        <ContextMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)} items={[
          { label: editable ? "编辑" : "查看", onClick: () => openCell(menu.r, menu.c) },
          { label: "复制 INSERT 语句", onClick: () => props.onCopyInsertRow?.(menu.r) },
        ]} />
      )}
    </div>
  );
}
