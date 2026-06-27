import { Moon, Sun, ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "./IconButton";
import type { ThemeName } from "../../theme/tokens";

/** 底部状态栏(高 34):主题切换 + DB 标识 + 分页器。 */
export function StatusBar(props: {
  themeName: ThemeName;
  onToggleTheme: () => void;
  dbLabel: string | null;
  showPager: boolean;
  page: number;
  pageSize: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div style={{
      height: 34, flexShrink: 0, padding: "0 10px 0 14px",
      background: "var(--statusbar-bg)", borderTop: "1px solid var(--border)",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
        <IconButton size={24} title="切换主题" onClick={props.onToggleTheme} style={{ borderRadius: "50%" }}>
          {props.themeName === "dark" ? <Moon size={14} /> : <Sun size={14} />}
        </IconButton>
        {props.dbLabel && (
          <span className="mono" style={{ fontSize: 12, color: "var(--fg-faint)", whiteSpace: "nowrap" }}>
            {props.dbLabel}
          </span>
        )}
      </div>

      {props.showPager && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--fg-muted)", whiteSpace: "nowrap" }}>
            第 <b style={{ color: "var(--fg)" }}>{props.page + 1}</b> 页 · 每页 {props.pageSize}
          </span>
          <IconButton size={24} title="上一页" disabled={!props.canPrev} onClick={props.onPrev}>
            <ChevronLeft size={15} />
          </IconButton>
          <IconButton size={24} title="下一页" disabled={!props.canNext} onClick={props.onNext}>
            <ChevronRight size={15} />
          </IconButton>
        </div>
      )}
    </div>
  );
}
