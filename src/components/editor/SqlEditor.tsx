import CodeMirror from "@uiw/react-codemirror";
import { sql, PostgreSQL } from "@codemirror/lang-sql";

/** SQL 编辑器,填满容器高度。运行按钮在结果栏,这里只保留 ⌘↵ 快捷键。 */
export function SqlEditor(props: {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
}) {
  return (
    <div style={{ height: "100%", overflow: "auto" }}
         onKeyDown={(e) => { if (e.metaKey && e.key === "Enter") { e.preventDefault(); props.onRun(); } }}>
      <CodeMirror
        value={props.value}
        height="100%"
        style={{ height: "100%" }}
        extensions={[sql({ dialect: PostgreSQL })]}
        onChange={props.onChange}
      />
    </div>
  );
}
