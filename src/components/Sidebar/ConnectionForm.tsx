import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { Database, KeyRound, FolderOpen, X } from "lucide-react";
import type { Connection, DbKind, Env } from "../../types";

const blank: Connection = {
  id: "", name: "", kind: "pg", env: "local", host: "127.0.0.1",
  port: 5432, user: "postgres", database: "postgres",
};

const KINDS: { value: DbKind; label: string }[] = [
  { value: "pg", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "redis", label: "Redis" },
  { value: "sqlite", label: "SQLite" },
];

const ENVS: { value: Env; color: string }[] = [
  { value: "local", color: "var(--env-local)" },
  { value: "staging", color: "var(--env-staging)" },
  { value: "prod", color: "var(--env-prod)" },
];

export function ConnectionForm(props: {
  initial?: Connection;
  onSubmit: (conn: Connection, password: string) => void;
  onCancel: () => void;
}) {
  const [c, setC] = useState<Connection>(props.initial ?? blank);
  const [pw, setPw] = useState("");
  const upd = (k: keyof Connection, v: string | number) => setC({ ...c, [k]: v });
  const isEdit = !!props.initial;
  const isSqlite = c.kind === "sqlite";

  const onKind = (kind: DbKind) => {
    if (kind === "sqlite") {
      // SQLite 是本地文件,无 主机/端口/用户/密码;环境固定 local
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

  // 唤起原生文件选择对话框,选中 SQLite 数据库文件后回填绝对路径
  const pickFile = async () => {
    const selected = await open({
      multiple: false,
      directory: false,
      title: "选择 SQLite 数据库文件",
      filters: [
        { name: "SQLite", extensions: ["db", "sqlite", "sqlite3", "db3"] },
        { name: "全部文件", extensions: ["*"] },
      ],
    });
    if (typeof selected === "string") upd("filePath", selected);
  };

  const field = { display: "grid", gap: 6 } as const;
  const caption = { fontSize: 12, color: "var(--fg-muted)", fontWeight: 600 } as const;
  const KindIcon = c.kind === "redis" ? KeyRound : Database;

  const Field = (label: string, node: React.ReactNode) => (
    <label style={field}>
      <span style={caption}>{label}</span>
      {node}
    </label>
  );
  const Input = (k: keyof Connection, placeholder: string, extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input className="form-input" placeholder={placeholder} value={String(c[k] ?? "")}
      onChange={(e) => upd(k, e.target.value)}
      autoCapitalize="none" autoCorrect="off" spellCheck={false} {...extra} />
  );

  return (
    <form onSubmit={(e) => {
        e.preventDefault();
        const id = c.id || crypto.randomUUID();
        props.onSubmit({ ...c, id }, pw);
      }}
      style={{ display: "grid", gap: 16, padding: 20 }}>

      {/* 头部:类型图标 + 标题 + 关闭 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ display: "flex", width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", background: "var(--raised-bg)", flexShrink: 0 }}>
          <KindIcon size={17} color="var(--accent-bright)" />
        </span>
        <div style={{ flex: 1, fontSize: 16, fontWeight: 700, color: "var(--fg)" }}>{isEdit ? "编辑连接" : "新建连接"}</div>
        <button type="button" className="icon-btn" onClick={props.onCancel} title="关闭" aria-label="关闭"
          style={{ width: 28, height: 28 }}><X size={16} /></button>
      </div>

      {/* 类型分段控件 */}
      <div style={field}>
        <span style={caption}>类型</span>
        <div className="seg" role="group" aria-label="类型">
          {KINDS.map((k) => (
            <button type="button" key={k.value} className={`seg-btn${c.kind === k.value ? " active" : ""}`}
              aria-pressed={c.kind === k.value} onClick={() => onKind(k.value)}>{k.label}</button>
          ))}
        </div>
      </div>

      {Field("名称", Input("name", "例如 prod-pg", { required: true }))}

      {isSqlite ? (
        Field("文件路径",
          <div style={{ display: "flex", gap: 6 }}>
            <input className="form-input" style={{ flex: 1, minWidth: 0 }} placeholder="/绝对路径/到/数据库.db"
              value={c.filePath ?? ""} onChange={(e) => upd("filePath", e.target.value)}
              autoCapitalize="none" autoCorrect="off" spellCheck={false} required />
            <button type="button" onClick={pickFile} title="选择文件" aria-label="选择文件"
              style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center",
                background: "var(--raised-bg)", border: "1px solid transparent", borderRadius: 8, cursor: "pointer", padding: "0 11px", color: "var(--fg-soft)" }}>
              <FolderOpen size={16} />
            </button>
          </div>,
        )
      ) : (
        <>
          {/* 环境分段控件(各环境用其徽章色)*/}
          <div style={field}>
            <span style={caption}>环境</span>
            <div className="seg" role="group" aria-label="环境">
              {ENVS.map((e) => {
                const active = c.env === e.value;
                return (
                  <button type="button" key={e.value} className="seg-btn" aria-pressed={active}
                    onClick={() => upd("env", e.value)}
                    style={active ? { color: e.color, fontWeight: 700, boxShadow: `inset 0 0 0 1px ${e.color}` } : undefined}>
                    {e.value}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 10 }}>
            {Field("主机", Input("host", "127.0.0.1"))}
            {Field("端口", <input className="form-input" type="number" placeholder="5432" value={c.port}
              onChange={(e) => upd("port", Number(e.target.value))} />)}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {Field("用户", Input("user", "postgres"))}
            {Field("数据库", Input("database", "postgres"))}
          </div>

          {Field("密码",
            <input className="form-input" type="password"
              placeholder={isEdit ? "留空表示不修改密码" : "留空表示无密码"}
              value={pw} onChange={(e) => setPw(e.target.value)} />)}
        </>
      )}

      {/* 底部:分隔线 + 操作按钮 */}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 2, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
        <button type="button" className="btn-pill" onClick={props.onCancel}
          style={{ color: "var(--fg-muted)", border: "1px solid var(--border)", padding: "9px 18px" }}>取消</button>
        <button type="submit" className="btn-pill btn-run" style={{ padding: "9px 22px" }}>保存</button>
      </div>
    </form>
  );
}
