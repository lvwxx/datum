import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronUp } from "lucide-react";
import type { QueryResult, CellEdit } from "../../api/pg";
import { Modal } from "../Modal";
import { ContextMenu } from "../ContextMenu";
import { copyToClipboard } from "../../lib/clipboard";
import { toast } from "../Toast";
import { classifyCell, colAlign } from "./cellStyle";
import { columnWidths } from "./columnFit";

const DEFAULT_W = 170;
const MIN_W = 48;
const ROW_H = 34;
const HEAD_H = 42;

// 列宽自适应的边界与采样
const AUTO_MIN = 64;     // 最窄
const AUTO_MAX = 420;    // 最宽(超长值靠拖拽展开)
const SAMPLE_ROWS = 120; // 仅采样前若干行估算宽度
const CELL_PAD = 32;     // 单元格左右各 16
const CHEVRON_SPACE = 20;// 表头排序箭头预留

const UI_FONT = '-apple-system, "Manrope Variable", BlinkMacSystemFont, "Segoe UI", sans-serif';
const MONO_FONT = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

// 复用一个离屏 canvas 测量文本宽度;无 canvas(如测试环境)时退化为字符数估算
let _measureCtx: CanvasRenderingContext2D | null | undefined;
function measureCtx(): CanvasRenderingContext2D | null {
  if (_measureCtx !== undefined) return _measureCtx;
  try { _measureCtx = document.createElement("canvas").getContext("2d") ?? null; }
  catch { _measureCtx = null; }
  return _measureCtx;
}
function textWidth(text: string, weight: number, size: number, mono: boolean): number {
  const ctx = measureCtx();
  if (!ctx || !ctx.measureText) return text.length * size * (mono ? 0.6 : 0.52);
  ctx.font = `${weight} ${size}px ${mono ? MONO_FONT : UI_FONT}`;
  return ctx.measureText(text).width;
}

export function ResultGrid(props: {
  result: QueryResult;
  pkCol: string | null;
  dirtyKeys: Set<string>;
  colTypes?: Record<string, string>;
  onStage: (e: Omit<CellEdit, "table">) => void;
  onCommit: () => void;
  onCopyInsertRow?: (rowIndex: number) => void;
  selectedRow?: number | null;
  onSelectRow?: (rowIndex: number) => void;
  sort?: { col: string; dir: "asc" | "desc" } | null;
  onSortColumn?: (col: string) => void; // 仅浏览表时提供:点击表头按该字段重查排序
}) {
  const { columns, rows } = props.result;
  const types = props.colTypes ?? {};
  const pkIndex = props.pkCol ? columns.indexOf(props.pkCol) : -1;
  const editable = pkIndex >= 0;
  const selectedRow = props.selectedRow ?? null;
  const [cell, setCell] = useState<{ r: number; c: number } | null>(null);
  const [draft, setDraft] = useState("");
  const [menu, setMenu] = useState<{ r: number; c: number; x: number; y: number } | null>(null);
  const [widths, setWidths] = useState<Record<number, number>>({});
  const [hoverRow, setHoverRow] = useState<number | null>(null);
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

  const single = columns.length === 1;

  // 初始按内容自适应每列宽度:表头(列名/类型)与采样单元格取最大,再夹到 [AUTO_MIN, AUTO_MAX]
  const autoWidths = useMemo(() => {
    return columns.map((col, i) => {
      let w = Math.max(
        textWidth(col, 700, 12, false) + CHEVRON_SPACE,
        types[col] ? textWidth(types[col], 600, 10, true) : 0,
      );
      const n = Math.min(rows.length, SAMPLE_ROWS);
      for (let r = 0; r < n; r++) {
        const v = rows[r][i];
        if (v == null) { w = Math.max(w, textWidth("NULL", 400, 13, true)); continue; }
        const { mono } = classifyCell(v, types[col]);
        // 超长值无需精确测量,截断后由 AUTO_MAX 兜底
        w = Math.max(w, textWidth(v.length > 80 ? v.slice(0, 80) : v, 400, 13, mono));
      }
      return Math.round(Math.min(AUTO_MAX, Math.max(AUTO_MIN, w + CELL_PAD)));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns.join("|"), rows, JSON.stringify(types)]);

  // 最终列宽:内容自适应为下限,窄于结果区时按比例伸展铺满(数字/布尔列保持紧凑),
  // 手动拖拽过的列固定;单列(如 EXPLAIN)取容器半宽。
  const colW = useMemo(() => {
    const flexible = columns.map((c) => colAlign(types[c]) === "left");
    return columnWidths(autoWidths, widths, containerW, DEFAULT_W, flexible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoWidths, widths, containerW, columns.join("|"), JSON.stringify(types)]);
  const colWidth = (i: number) => colW[i] ?? DEFAULT_W;
  const totalWidth = colW.reduce((s, w) => s + w, 0);
  const fill = Math.max(0, containerW - totalWidth); // 全列固定且仍有余宽时用空白列补满

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
    height: HEAD_H, padding: "0 16px", boxSizing: "border-box",
    position: "sticky", top: 0, zIndex: 3, background: "var(--header-bg)",
    borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--hairline-strong)",
    verticalAlign: "middle",
  };

  return (
    <div ref={rootRef} tabIndex={0} data-keep-sel
         onKeyDown={(e) => { if (e.metaKey && e.key.toLowerCase() === "s") { e.preventDefault(); props.onCommit(); } }}
         style={{ outline: "none" }}>
      {props.pkCol === null &&
        <div style={{ color: "var(--fg-faint)", fontSize: 12, padding: "6px 16px" }}>该结果无主键,双击可查看完整内容,暂不可编辑</div>}
      <table style={{ borderCollapse: "collapse", fontSize: 13, tableLayout: "fixed", width: Math.max(totalWidth, containerW) }}>
        <colgroup>
          {columns.map((c, i) => <col key={`${c}-${i}`} style={{ width: colWidth(i) }} />)}
          {fill > 0 && <col style={{ width: fill }} />}
        </colgroup>
        <thead>
          <tr>
            {columns.map((c, i) => {
              const sortable = !!props.onSortColumn;
              const sorted = props.sort?.col === c;
              const align = colAlign(types[c]);
              return (
              <th key={`${c}-${i}`}
                  onClick={sortable ? () => props.onSortColumn!(c) : undefined}
                  title={sortable ? "点击排序(倒序 → 升序 → 取消)" : undefined}
                  style={{ ...thStyle, cursor: sortable ? "pointer" : "default" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, height: "100%" }}>
                  <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", alignItems: align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{c}</span>
                    {types[c] && <span className="mono" style={{ fontSize: 10, fontWeight: 600, color: "var(--fg-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{types[c]}</span>}
                  </div>
                  {sorted && (
                    <ChevronUp size={13} color="var(--accent-bright)" style={{ flexShrink: 0, transition: "transform 0.12s cubic-bezier(0.3,0,0,1)", transform: props.sort!.dir === "desc" ? "rotate(180deg)" : "none" }} />
                  )}
                </div>
                <span
                  onMouseDown={(e) => startResize(i, e)}
                  onClick={(e) => e.stopPropagation()}
                  title="拖动调整列宽"
                  style={{ position: "absolute", top: 0, right: 0, width: 7, height: "100%", cursor: "col-resize" }}
                />
              </th>
              );
            })}
            {fill > 0 && <th style={{ ...thStyle, borderRight: "none" }} />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const selected = selectedRow === ri;
            const hovered = hoverRow === ri;
            const rowBg = selected ? "var(--selection)" : hovered ? "var(--row-hover)" : (ri % 2 === 1 ? "var(--zebra)" : "transparent");
            return (
              <tr key={ri}
                  onMouseEnter={() => setHoverRow(ri)}
                  onMouseLeave={() => setHoverRow((h) => (h === ri ? null : h))}
                  style={{ cursor: "default" }}>
                {row.map((cellVal, ci) => {
                  const pkValue = pkIndex >= 0 ? row[pkIndex] ?? "" : "";
                  const dirty = props.dirtyKeys.has(`${pkValue}|${columns[ci]}`);
                  const bg = dirty ? "var(--dirty-bg)" : rowBg;
                  const align = colAlign(types[columns[ci]]);
                  const { color, mono, hash } = classifyCell(cellVal, types[columns[ci]]);
                  const isNull = cellVal == null;
                  const leftBar = selected && ci === 0 ? "inset 2px 0 0 var(--accent)" : undefined;
                  const dirtyRing = dirty ? "inset 0 0 0 1px var(--accent)" : undefined;
                  return (
                    <td key={ci}
                        onDoubleClick={() => openCell(ri, ci)}
                        onContextMenu={(e) => { e.preventDefault(); setMenu({ r: ri, c: ci, x: e.clientX, y: e.clientY }); }}
                        title="双击查看完整内容"
                        className={mono ? "mono" : undefined}
                        style={{
                          height: ROW_H, padding: single ? "8px 16px" : "0 16px", boxSizing: "border-box",
                          background: bg, color, textAlign: align,
                          fontStyle: isNull ? "italic" : undefined,
                          letterSpacing: hash ? "0.03em" : undefined,
                          borderRight: "1px solid var(--border)",
                          borderBottom: "1px solid var(--border)",
                          boxShadow: dirtyRing ?? leftBar,
                          whiteSpace: single ? "pre-wrap" : "nowrap",
                          overflow: "hidden", textOverflow: "ellipsis",
                          wordBreak: single ? "break-word" : undefined,
                        }}>
                      {cellVal ?? "NULL"}
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
                style={{ flexShrink: 0, padding: "3px 12px", fontSize: 12 }}>
                复制
              </button>
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              readOnly={!editable}
              spellCheck={false}
              autoFocus
              className="mono"
              style={{
                width: "100%", minHeight: 220, boxSizing: "border-box", padding: 10,
                fontSize: 13, lineHeight: 1.5, resize: "vertical",
                background: "var(--bg)", color: "var(--fg)",
                border: "1px solid var(--border)", borderRadius: 6,
              }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              {editable && (
                <button className="btn-pill btn-run" onClick={applyEdit} style={{ padding: "6px 16px", fontSize: 13 }}>
                  暂存修改
                </button>
              )}
              <button onClick={() => setCell(null)} style={{ padding: "6px 16px", fontSize: 13 }}>关闭</button>
            </div>
          </div>
        </Modal>
      )}

      {menu && (
        <ContextMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)} items={[
          { label: "查看详情", onClick: () => props.onSelectRow?.(menu.r) },
          { label: editable ? "编辑" : "查看", onClick: () => openCell(menu.r, menu.c) },
          { label: "复制 INSERT 语句", onClick: () => props.onCopyInsertRow?.(menu.r) },
        ]} />
      )}
    </div>
  );
}
