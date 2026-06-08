import { useState } from "react";
import type { QueryResult, CellEdit } from "../../api/pg";

export function ResultGrid(props: {
  result: QueryResult;
  pkCol: string | null;
  dirtyKeys: Set<string>;
  onStage: (e: Omit<CellEdit, "table">) => void;
  onCommit: () => void;
}) {
  const { columns, rows } = props.result;
  const pkIndex = props.pkCol ? columns.indexOf(props.pkCol) : -1;
  const [editing, setEditing] = useState<{ r: number; c: number } | null>(null);

  const onCellChange = (rowIdx: number, colIdx: number, value: string) => {
    if (pkIndex < 0) return;
    const pkValue = rows[rowIdx][pkIndex] ?? "";
    props.onStage({ pkCol: props.pkCol!, pkValue, column: columns[colIdx], newValue: value });
  };

  return (
    <div tabIndex={0}
         onKeyDown={(e) => { if (e.metaKey && e.key.toLowerCase() === "s") { e.preventDefault(); props.onCommit(); } }}
         style={{ padding: 8, outline: "none" }}>
      {props.pkCol === null &&
        <div style={{ color: "var(--error)", fontSize: 11, marginBottom: 6 }}>该结果无主键,暂不可编辑</div>}
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
        <thead>
          <tr style={{ color: "var(--fg-muted)", textAlign: "left" }}>
            {columns.map((c) => <th key={c} style={{ padding: 4, fontWeight: 500 }}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ borderTop: "1px solid var(--border)" }}>
              {row.map((cell, ci) => {
                const pkValue = pkIndex >= 0 ? row[pkIndex] ?? "" : "";
                const dirty = props.dirtyKeys.has(`${pkValue}|${columns[ci]}`);
                const isEditing = editing?.r === ri && editing?.c === ci;
                return (
                  <td key={ci}
                      onDoubleClick={() => props.pkCol && setEditing({ r: ri, c: ci })}
                      style={{
                        padding: 4,
                        background: dirty ? "var(--dirty-bg)" : "transparent",
                        border: dirty ? "1px solid var(--accent)" : undefined,
                      }}>
                    {isEditing ? (
                      <input autoFocus defaultValue={cell ?? ""}
                        onBlur={(e) => { onCellChange(ri, ci, e.target.value); setEditing(null); }}
                        style={{ width: "100%", font: "inherit" }} />
                    ) : (cell ?? <span style={{ color: "var(--fg-muted)" }}>NULL</span>)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
