import CodeMirror from "@uiw/react-codemirror";
import { sql, PostgreSQL } from "@codemirror/lang-sql";

export function SqlEditor(props: {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "6px 8px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--border)" }}>
        <span style={{ color: "var(--fg-muted)", fontSize: 10 }}>⌨ SQL</span>
        <button onClick={props.onRun}
          style={{ background: "var(--accent)", color: "#fff", border: 0, borderRadius: 4, padding: "2px 10px", fontSize: 11 }}>
          ▶ 运行 ⌘↵
        </button>
      </div>
      <CodeMirror
        value={props.value}
        height="160px"
        extensions={[sql({ dialect: PostgreSQL })]}
        onChange={props.onChange}
        onKeyDown={(e) => { if (e.metaKey && e.key === "Enter") { e.preventDefault(); props.onRun(); } }}
      />
    </div>
  );
}
