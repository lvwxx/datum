import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { Database, FolderOpen, X, ChevronsUpDown, Eye, Activity, Link2 } from "lucide-react";
import type { Connection, DbKind, Env } from "../../types";

const blank: Connection = {
  id: "", name: "", kind: "pg", env: "local", host: "127.0.0.1",
  port: 5432, user: "postgres", database: "postgres",
};

const KINDS: { value: DbKind; label: string }[] = [
  { value: "pg", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "sqlite", label: "SQLite" },
  { value: "redis", label: "Redis" },
];

const ENVS: { value: Env; color: string }[] = [
  { value: "local", color: "var(--env-local)" },
  { value: "staging", color: "var(--env-staging)" },
  { value: "prod", color: "var(--env-prod)" },
];

const SCHEME: Record<DbKind, string> = { pg: "postgresql", mysql: "mysql", sqlite: "sqlite", redis: "redis" };

const lbl: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-faint)",
};
const fieldCol: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 8 };

export function ConnectionForm(props: {
  initial?: Connection;
  onSubmit: (conn: Connection, password: string) => void;
  onCancel: () => void;
  onTest?: () => void;
}) {
  const [c, setC] = useState<Connection>(props.initial ?? blank);
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const upd = (k: keyof Connection, v: string | number) => setC({ ...c, [k]: v });
  const isEdit = !!props.initial;
  const isSqlite = c.kind === "sqlite";

  const onKind = (kind: DbKind) => {
    if (kind === "sqlite") {
      setC({ ...c, kind, env: "local", host: "", port: 0, user: "", database: "", filePath: c.filePath ?? "" });
    } else {
      setC({
        ...c, kind,
        port: kind === "redis" ? 6379 : kind === "mysql" ? 3306 : 5432,
        user: kind === "mysql" ? "root" : kind === "redis" ? c.user : "postgres",
        database: kind === "redis" ? "0" : kind === "mysql" ? "" : "postgres",
      });
    }
  };

  const pickFile = async () => {
    const selected = await open({
      multiple: false, directory: false, title: "选择 SQLite 数据库文件",
      filters: [
        { name: "SQLite", extensions: ["db", "sqlite", "sqlite3", "db3"] },
        { name: "全部文件", extensions: ["*"] },
      ],
    });
    if (typeof selected === "string") upd("filePath", selected);
  };

  // 连接串预览(密码以圆点掩码)
  const connString = isSqlite
    ? `sqlite://${c.filePath || "/路径/到/数据库.db"}`
    : (() => {
        const host = c.host || "127.0.0.1";
        const port = c.port || "";
        const user = c.user || "postgres";
        const db = c.database || "postgres";
        const auth = pw ? `${user}:••••@` : `${user}@`;
        return `${SCHEME[c.kind]}://${auth}${host}${port ? `:${port}` : ""}/${db}`;
      })();

  const Input = (id: string, k: keyof Connection, placeholder: string, mono = true, extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input id={id} className={mono ? "form-input mono" : "form-input"} placeholder={placeholder}
      value={String(c[k] ?? "")} onChange={(e) => upd(k, e.target.value)}
      autoCapitalize="none" autoCorrect="off" spellCheck={false} {...extra} />
  );

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); const id = c.id || crypto.randomUUID(); props.onSubmit({ ...c, id }, pw); }}
      style={{
        width: 600, maxWidth: "92vw", maxHeight: "90vh", display: "flex", flexDirection: "column",
        background: "var(--bg-panel)", color: "var(--fg)", borderRadius: 16, overflow: "hidden",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      }}
    >
      {/* 头部 */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "24px 28px 18px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: "0.01em", color: "var(--fg)" }}>{isEdit ? "编辑连接" : "新建连接"}</h2>
          <span style={{ fontSize: 13, color: "var(--fg-faint)" }}>{isEdit ? "修改这个数据库连接的配置" : "配置一个新的数据库连接"}</span>
        </div>
        <button type="button" className="icon-btn" onClick={props.onCancel} title="关闭" aria-label="关闭"
          style={{ width: 30, height: 30, borderRadius: "50%" }}><X size={17} /></button>
      </div>

      {/* 主体 */}
      <div style={{ padding: "4px 28px 8px", display: "flex", flexDirection: "column", gap: 18, overflowY: "auto" }}>

        {/* 类型 + 名称 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={fieldCol}>
            <label htmlFor="cf-type" style={lbl}>类型</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <span style={{ position: "absolute", left: 12, display: "flex", pointerEvents: "none" }}>
                <Database size={16} color="var(--accent)" />
              </span>
              <select id="cf-type" className="form-input mono" value={c.kind} onChange={(e) => onKind(e.target.value as DbKind)}
                style={{ paddingLeft: 36, paddingRight: 34, appearance: "none", WebkitAppearance: "none" }}>
                {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
              <span style={{ position: "absolute", right: 12, display: "flex", pointerEvents: "none", color: "var(--fg-faint)" }}>
                <ChevronsUpDown size={15} />
              </span>
            </div>
          </div>
          <div style={fieldCol}>
            <label htmlFor="cf-name" style={lbl}>名称</label>
            {Input("cf-name", "name", "例如 prod-pg", false, { required: true })}
          </div>
        </div>

        {isSqlite ? (
          <div style={fieldCol}>
            <label htmlFor="cf-file" style={lbl}>文件路径</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input id="cf-file" className="form-input mono" style={{ flex: 1, minWidth: 0 }} placeholder="/绝对路径/到/数据库.db"
                value={c.filePath ?? ""} onChange={(e) => upd("filePath", e.target.value)}
                autoCapitalize="none" autoCorrect="off" spellCheck={false} required />
              <button type="button" onClick={pickFile} title="选择文件" aria-label="选择文件"
                style={{ flex: "0 0 auto", width: 40, height: 40, display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: "var(--raised-bg)", border: "none", borderRadius: 6, cursor: "pointer", color: "var(--fg-soft)", boxShadow: "inset 0 0 0 1px var(--border)" }}>
                <FolderOpen size={16} />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 环境分段控件 */}
            <div style={fieldCol}>
              <span style={lbl}>环境</span>
              <div style={{ display: "flex", gap: 6, background: "var(--raised-bg)", padding: 4, borderRadius: 9999 }}>
                {ENVS.map((e) => {
                  const active = c.env === e.value;
                  return (
                    <button type="button" key={e.value} onClick={() => upd("env", e.value)} aria-pressed={active}
                      style={{
                        flex: 1, height: 32, border: "none", cursor: "pointer", borderRadius: 9999,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                        fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                        background: active ? "var(--bg-panel)" : "transparent",
                        color: active ? e.color : "var(--fg-faint)",
                        boxShadow: active ? "0 1px 3px rgba(0,0,0,0.3)" : "none",
                        transition: "color .12s, background .12s",
                      }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", flex: "0 0 auto", background: active ? e.color : "var(--fg-faint)" }} />
                      {e.value.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 主机 + 端口 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 132px", gap: 16 }}>
              <div style={fieldCol}>
                <label htmlFor="cf-host" style={lbl}>主机</label>
                {Input("cf-host", "host", "127.0.0.1")}
              </div>
              <div style={fieldCol}>
                <label htmlFor="cf-port" style={lbl}>端口</label>
                <input id="cf-port" className="form-input mono" inputMode="numeric" placeholder="5432"
                  value={c.port} onChange={(e) => upd("port", Number(e.target.value))} />
              </div>
            </div>

            {/* 用户 + 密码 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={fieldCol}>
                <label htmlFor="cf-user" style={lbl}>用户</label>
                {Input("cf-user", "user", "postgres")}
              </div>
              <div style={fieldCol}>
                <label htmlFor="cf-pw" style={lbl}>密码</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input id="cf-pw" className="form-input mono" type={showPw ? "text" : "password"}
                    placeholder={isEdit ? "留空表示不修改" : "留空表示无密码"} style={{ paddingRight: 38 }}
                    value={pw} onChange={(e) => setPw(e.target.value)} />
                  <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "隐藏密码" : "显示密码"} title={showPw ? "隐藏密码" : "显示密码"}
                    style={{ position: "absolute", right: 6, width: 28, height: 28, border: "none", background: "transparent",
                      color: "var(--fg-faint)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: showPw ? 1 : 0.55 }}>
                    <Eye size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* 数据库 */}
            <div style={fieldCol}>
              <label htmlFor="cf-db" style={lbl}>数据库</label>
              {Input("cf-db", "database", "postgres")}
            </div>
          </>
        )}

        {/* 连接串预览 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: "var(--bg)", borderRadius: 6, boxShadow: "inset 0 0 0 1px var(--border)" }}>
          <Link2 size={14} color="var(--fg-faint)" style={{ flex: "0 0 auto" }} />
          <span className="mono" style={{ fontSize: 12.5, color: "var(--fg-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{connString}</span>
        </div>
      </div>

      {/* 底部 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 28px 24px", marginTop: 6 }}>
        <button type="button" className="btn-pill" onClick={props.onTest}
          style={{ height: 38, padding: "0 18px", border: "1px solid var(--fg-faint)", background: "transparent", color: "var(--fg-soft)", fontSize: 13, fontWeight: 700, gap: 8 }}>
          <Activity size={15} /> 测试连接
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" className="btn-pill" onClick={props.onCancel}
            style={{ height: 38, padding: "0 22px", border: "none", background: "transparent", color: "var(--fg-muted)", fontSize: 14, fontWeight: 700 }}>取消</button>
          <button type="submit" className="btn-pill btn-run"
            style={{ height: 38, padding: "0 26px", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>保存连接</button>
        </div>
      </div>
    </form>
  );
}
