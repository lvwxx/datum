import { Filter, ArrowUpDown, Download, Play } from "lucide-react";
import { IconButton } from "../chrome/IconButton";
import { toast } from "../Toast";
import type { QueryResult } from "../../api/pg";
import type { DbKind } from "../../types";

const divider = (
  <span style={{ width: 1, height: 16, background: "var(--border)", flexShrink: 0 }} />
);

/** 结果工具栏(高 48):左侧行列数/用时,右侧 filter/sort/export + Explain + Run。 */
export function ResultsToolbar(props: {
  err: string | null;
  result: QueryResult | null;
  isQuery: boolean;
  elapsedMs: number | null;
  kind: DbKind;
  onRun: () => void;
  onExplain: () => void;
  onExport: () => void;
}) {
  const { err, result, isQuery } = props;
  const canExport = !err && !!result && result.rows.length > 0;

  return (
    <div style={{
      height: 48, flexShrink: 0, padding: "0 20px",
      borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
    }}>
      {/* 左:状态 / 行列数 / 用时 */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 13, overflow: "hidden" }}>
        {err ? (
          <span style={{ color: "var(--error)", fontWeight: 700 }}>查询出错</span>
        ) : result ? (
          <>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent-bright)", flexShrink: 0 }} />
            <span style={{ color: "var(--fg-muted)", whiteSpace: "nowrap" }}>
              {!isQuery
                ? <>执行成功{result.affected ? <> · 影响 <b style={{ color: "var(--fg)" }}>{result.affected}</b> 行</> : ""}</>
                : <><b style={{ color: "var(--fg)" }}>{result.rows.length}</b> 行 · <b style={{ color: "var(--fg)" }}>{result.columns.length}</b> 列</>}
            </span>
            {props.elapsedMs != null && (
              <>
                {divider}
                <span className="mono" style={{ color: "var(--fg-faint)", whiteSpace: "nowrap" }}>用时 {props.elapsedMs} ms</span>
              </>
            )}
          </>
        ) : (
          <span style={{ color: "var(--fg-faint)" }}>就绪</span>
        )}
      </div>

      {/* 右:工具图标 + Explain + Run */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <IconButton size={32} title="筛选(即将支持)" onClick={() => toast.info("筛选即将支持")}><Filter size={17} /></IconButton>
        <IconButton size={32} title="排序(即将支持)" onClick={() => toast.info("排序即将支持")}><ArrowUpDown size={17} /></IconButton>
        <IconButton size={32} title="导出 CSV" disabled={!canExport} onClick={props.onExport}><Download size={17} /></IconButton>
        <span style={{ width: 1, height: 18, background: "var(--border)" }} />
        {props.kind !== "redis" && (
          <button className="btn-pill btn-explain" onClick={props.onExplain} title="查看执行计划(EXPLAIN)"
            style={{ height: 32, padding: "0 16px", fontSize: 13 }}>
            Explain
          </button>
        )}
        <button className="btn-pill btn-run" onClick={props.onRun} title="运行 (⌘↵)"
          style={{ height: 32, padding: "0 16px", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          <Play size={13} fill="currentColor" /> 运行
          <span className="mono" style={{ fontWeight: 600, opacity: 0.5, textTransform: "none", letterSpacing: 0 }}>⌘↩</span>
        </button>
      </div>
    </div>
  );
}
