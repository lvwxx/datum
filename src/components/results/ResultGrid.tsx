import { useEffect, useState } from "react";
import type { QueryResult, CellEdit } from "../../api/pg";
import { Modal } from "../Modal";

const DEFAULT_W = 160;
const MIN_W = 48;

export function ResultGrid(props: {
  result: QueryResult;
  pkCol: string | null;
  dirtyKeys: Set<string>;
  onStage: (e: Omit<CellEdit, "table">) => void;
  onCommit: () => void;
  onRowContext?: (rowIndex: number, x: number, y: number) => void;
}) {
  const { columns, rows } = props.result;
  const pkIndex = props.pkCol ? columns.indexOf(props.pkCol) : -1;
  const editable = pkIndex >= 0;
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [cell, setCell] = useState<{ r: number; c: number } | null>(null);
  const [draft, setDraft] = useState("");
  const [widths, setWidths] = useState<Record<number, number>>({});

  // 结果列集变化(切表/换查询)时重置列宽
  useEffect(() => { setWidths({}); }, [columns.join("|")]);

  const colWidth = (i: number) => widths[i] ?? DEFAULT_W;
  const totalWidth = columns.reduce((s, _c, i) => s + colWidth(i), 0);

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
    <div tabIndex={0}
         onKeyDown={(e) => { if (e.metaKey && e.key.toLowerCase() === "s") { e.preventDefault(); props.onCommit(); } }}
         style={{ outline: "none" }}>
      {props.pkCol === null &&
        <div style={{ color: "var(--fg-muted)", fontSize: 11, padding: "4px 8px" }}>该结果无主键,双击可查看完整内容,暂不可编辑</div>}
      <table style={{ borderCollapse: "collapse", fontSize: 12, tableLayout: "fixed", width: totalWidth }}>
        <colgroup>
          {columns.map((c, i) => <col key={`${c}-${i}`} style={{ width: colWidth(i) }} />)}
        </colgroup>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={`${c}-${i}`} style={{ ...thStyle, position: "sticky" }}>
                <span style={ellipsis as React.CSSProperties}>{c}</span>
                <span
                  onMouseDown={(e) => startResize(i, e)}
                  onClick={(e) => e.stopPropagation()}
                  title="拖动调整列宽"
                  style={{ position: "absolute", top: 0, right: 0, width: 7, height: "100%", cursor: "col-resize" }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const selected = selectedRow === ri;
            return (
              <tr key={ri} onClick={() => setSelectedRow(ri)}
                  onContextMenu={(e) => { e.preventDefault(); setSelectedRow(ri); props.onRowContext?.(ri, e.clientX, e.clientY); }}>
                {row.map((cellVal, ci) => {
                  const pkValue = pkIndex >= 0 ? row[pkIndex] ?? "" : "";
                  const dirty = props.dirtyKeys.has(`${pkValue}|${columns[ci]}`);
                  const bg = dirty ? "var(--dirty-bg)" : selected ? "var(--selection)" : "transparent";
                  return (
                    <td key={ci}
                        onDoubleClick={() => openCell(ri, ci)}
                        title="双击查看完整内容"
                        style={{
                          padding: 0, background: bg,
                          borderRight: "1px solid var(--border)",
                          borderBottom: "1px solid var(--border)",
                          boxShadow: dirty ? "inset 0 0 0 1px var(--accent)" : undefined,
                        }}>
                      <div style={{ ...ellipsis, padding: "3px 6px" }}>
                        {cellVal ?? <span style={{ color: "var(--fg-muted)" }}>NULL</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {cell && (
        <Modal onClose={() => setCell(null)}>
          <div style={{ padding: 14, display: "grid", gap: 10, minWidth: 380, maxWidth: 600 }}>
            <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
              列 <b style={{ color: "var(--fg)" }}>{columns[cell.c]}</b>
              {editable ? "" : " · 仅查看(无主键)"}
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
    </div>
  );
}
