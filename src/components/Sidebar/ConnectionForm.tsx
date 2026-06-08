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
}) {
  const [c, setC] = useState<Connection>(props.initial ?? blank);
  const [pw, setPw] = useState("");
  const upd = (k: keyof Connection, v: string | number) => setC({ ...c, [k]: v });

  return (
    <form onSubmit={(e) => {
        e.preventDefault();
        const id = c.id || crypto.randomUUID();
        props.onSubmit({ ...c, id }, pw);
      }}
      style={{ display: "grid", gap: 6, padding: 8 }}>
      <input placeholder="名称" value={c.name} onChange={(e) => upd("name", e.target.value)} required />
      <select value={c.env} onChange={(e) => upd("env", e.target.value as Env)}>
        <option value="local">local</option>
        <option value="staging">staging</option>
        <option value="prod">prod</option>
      </select>
      <input placeholder="主机" value={c.host} onChange={(e) => upd("host", e.target.value)} />
      <input type="number" placeholder="端口" value={c.port}
             onChange={(e) => upd("port", Number(e.target.value))} />
      <input placeholder="用户" value={c.user} onChange={(e) => upd("user", e.target.value)} />
      <input placeholder="数据库" value={c.database} onChange={(e) => upd("database", e.target.value)} />
      <input type="password" placeholder="密码" value={pw} onChange={(e) => setPw(e.target.value)} />
      <div style={{ display: "flex", gap: 6 }}>
        <button type="submit" style={{ background: "var(--accent)", color: "#fff", border: 0, padding: "4px 10px", borderRadius: 4 }}>保存</button>
        <button type="button" onClick={props.onCancel}>取消</button>
      </div>
    </form>
  );
}
