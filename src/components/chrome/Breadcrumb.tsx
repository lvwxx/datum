import { Database, ChevronsRight } from "lucide-react";
import { IconButton } from "./IconButton";

const sep = <span style={{ color: "var(--fg-faint)" }}>/</span>;
const faint = (t: string) => <span style={{ color: "var(--fg-faint)" }}>{t}</span>;

/** 面包屑栏(高 50):连接 / 库 / 表 路径 + 右侧折叠详情按钮。 */
export function Breadcrumb(props: {
  connName: string | null;
  dbName: string | null;
  tableLabel: string | null;
  tableWord: string;      // “表” | “key”
  rightOpen: boolean;
  onToggleRight: () => void;
}) {
  return (
    <div style={{
      height: 50, flexShrink: 0, padding: "0 20px",
      borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14, overflow: "hidden", whiteSpace: "nowrap" }}>
        <Database size={16} color="var(--fg-muted)" style={{ flexShrink: 0 }} />
        {props.connName ? (
          <>
            <span style={{ fontWeight: 700, color: "var(--fg)" }}>{props.connName}</span>
            {sep}{faint("库")}
            <span className="mono" style={{ fontSize: 13, color: "var(--fg-muted)", overflow: "hidden", textOverflow: "ellipsis" }}>
              {props.dbName ?? "—"}
            </span>
            {props.tableLabel && (
              <>
                {sep}{faint(props.tableWord)}
                <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {props.tableLabel}
                </span>
              </>
            )}
          </>
        ) : (
          <span style={{ color: "var(--fg-muted)" }}>未连接 —— 点左侧连接</span>
        )}
      </div>
      <IconButton title={props.rightOpen ? "隐藏详情栏" : "显示详情栏"} onClick={props.onToggleRight}>
        <ChevronsRight size={18} style={{ transform: props.rightOpen ? "none" : "rotate(180deg)", transition: "transform 0.12s cubic-bezier(0.3,0,0,1)" }} />
      </IconButton>
    </div>
  );
}
