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

  const labelStyle = { display: "grid", gap: 2 } as const;
  const captionStyle = { fontSize: 10, color: "var(--fg-muted)" } as const;

  return (
    <form onSubmit={(e) => {
        e.preventDefault();
        const id = c.id || crypto.randomUUID();
        props.onSubmit({ ...c, id }, pw);
      }}
      style={{ display: "grid", gap: 6, padding: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 600 }}>{props.initial ? "编辑连接" : "新建连接"}</div>

      <label style={labelStyle}>
        <span style={captionStyle}>名称</span>
        <input placeholder="例如 prod-pg" value={c.name} onChange={(e) => upd("name", e.target.value)}
               autoCapitalize="none" autoCorrect="off" spellCheck={false} required />
      </label>

      <label style={labelStyle}>
        <span style={captionStyle}>环境</span>
        <select value={c.env} onChange={(e) => upd("env", e.target.value as Env)}>
          <option value="local">local</option>
          <option value="staging">staging</option>
          <option value="prod">prod</option>
        </select>
      </label>

      <label style={labelStyle}>
        <span style={captionStyle}>主机</span>
        <input placeholder="127.0.0.1" value={c.host} onChange={(e) => upd("host", e.target.value)}
               autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      </label>

      <label style={labelStyle}>
        <span style={captionStyle}>端口</span>
        <input type="number" placeholder="5432" value={c.port}
               onChange={(e) => upd("port", Number(e.target.value))} />
      </label>

      <label style={labelStyle}>
        <span style={captionStyle}>用户</span>
        <input placeholder="postgres" value={c.user} onChange={(e) => upd("user", e.target.value)}
               autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      </label>

      <label style={labelStyle}>
        <span style={captionStyle}>数据库</span>
        <input placeholder="postgres" value={c.database} onChange={(e) => upd("database", e.target.value)}
               autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      </label>

      <label style={labelStyle}>
        <span style={captionStyle}>{isEdit ? "密码(留空 = 不修改)" : "密码(可留空)"}</span>
        <input type="password"
               placeholder={isEdit ? "留空表示不修改密码" : "留空表示无密码"}
               value={pw} onChange={(e) => setPw(e.target.value)} />
      </label>

      <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
        <button type="submit" style={{ background: "var(--accent)", color: "#fff", border: 0, padding: "4px 10px", borderRadius: 4 }}>保存</button>
        <button type="button" onClick={props.onCancel}>取消</button>
        {isEdit && props.onDelete && (
          <button type="button" onClick={props.onDelete}
            style={{ marginLeft: "auto", background: "transparent", border: "1px solid var(--error)",
                     color: "var(--error)", padding: "4px 10px", borderRadius: 4, cursor: "pointer" }}>
            删除
          </button>
        )}
      </div>
    </form>
  );
}
