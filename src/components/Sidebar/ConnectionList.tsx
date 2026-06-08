import type { Connection, Env } from "../../types";

const envVar: Record<Env, string> = {
  local: "var(--env-local)", staging: "var(--env-staging)", prod: "var(--env-prod)",
};

export function ConnectionList(props: {
  connections: Connection[];
  activeId: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {props.connections.map((c) => (
        <li key={c.id}
            onClick={() => props.onPick(c.id)}
            style={{
              padding: "6px 8px", cursor: "pointer", display: "flex",
              alignItems: "center", gap: 6,
              background: c.id === props.activeId ? "var(--selection)" : "transparent",
            }}>
          <span>🟢 </span><span>{c.name}</span>
          <span style={{
            background: envVar[c.env], color: "#fff", fontSize: 9,
            padding: "0 5px", borderRadius: 3,
          }}>{c.env.toUpperCase()}</span>
        </li>
      ))}
    </ul>
  );
}
