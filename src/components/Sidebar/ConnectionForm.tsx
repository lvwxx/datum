import { useState } from "react";
import type { Connection, Env } from "../../types";

const blank: Connection = {
  id: "", name: "", kind: "pg", env: "local", host: "127.0.0.1",
  port: 5432, user: "postgres", database: "postgres",
};

export function ConnectionForm(props: {
  initial?: Connection;
  onSubmit: (conn: Connection, password: string) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [c, setC] = useState<Connection>(props.initial ?? blank);
  const [pw, setPw] = useState("");
  const upd = (k: keyof Connection, v: string | number) => setC({ ...c, [k]: v });
  const isEdit = !!props.initial;

  const field = { display: "grid", gap: 5 } as const;
  const caption = { fontSize: 12, color: "var(--fg)", fontWeight: 600 } as const; // 配置名:最深

  const primaryBtn: React.CSSProperties = {
    background: "var(--accent)", color: "#fff", border: 0, borderRadius: 12,
    padding: "9px 20px", cursor: "pointer", fontWeight: 600,
  };
  const ghostBtn: React.CSSProperties = {
    background: "transparent", color: "var(--fg-muted)", border: "1px solid var(--border)",
    borderRadius: 12, padding: "9px 18px", cursor: "pointer",
  };
  const dangerBtn: React.CSSProperties = {
    marginLeft: "auto", background: "transparent", color: "var(--error)",
    border: "1px solid transparent", borderRadius: 12, padding: "9px 14px", cursor: "pointer",
  };

  return (
    <form onSubmit={(e) => {
        e.preventDefault();
        const id = c.id || crypto.randomUUID();
        props.onSubmit({ ...c, id }, pw);
      }}
      style={{ display: "grid", gap: 14, padding: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)" }}>{isEdit ? "编辑连接" : "新建连接"}</div>

      <label style={field}>
        <span style={caption}>名称</span>
        <input placeholder="例如 prod-pg" value={c.name} onChange={(e) => upd("name", e.target.value)}
               autoCapitalize="none" autoCorrect="off" spellCheck={false} required />
      </label>

      <label style={field}>
        <span style={caption}>环境</span>
        <select value={c.env} onChange={(e) => upd("env", e.target.value as Env)}>
          <option value="local">local</option>
          <option value="staging">staging</option>
          <option value="prod">prod</option>
        </select>
      </label>

      <label style={field}>
        <span style={caption}>主机</span>
        <input placeholder="127.0.0.1" value={c.host} onChange={(e) => upd("host", e.target.value)}
               autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      </label>

      <label style={field}>
        <span style={caption}>端口</span>
        <input type="number" placeholder="5432" value={c.port}
               onChange={(e) => upd("port", Number(e.target.value))} />
      </label>

      <label style={field}>
        <span style={caption}>用户</span>
        <input placeholder="postgres" value={c.user} onChange={(e) => upd("user", e.target.value)}
               autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      </label>

      <label style={field}>
        <span style={caption}>数据库</span>
        <input placeholder="postgres" value={c.database} onChange={(e) => upd("database", e.target.value)}
               autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      </label>

      <label style={field}>
        <span style={caption}>密码</span>
        <input type="password"
               placeholder={isEdit ? "留空表示不修改密码" : "留空表示无密码"}
               value={pw} onChange={(e) => setPw(e.target.value)} />
      </label>

      <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
        <button type="submit" style={primaryBtn}>保存</button>
        <button type="button" onClick={props.onCancel} style={ghostBtn}>取消</button>
        {isEdit && props.onDelete && (
          <button type="button" onClick={props.onDelete} style={dangerBtn}>删除</button>
        )}
      </div>
    </form>
  );
}
