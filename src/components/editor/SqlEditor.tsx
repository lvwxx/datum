import CodeMirror from "@uiw/react-codemirror";
import { sql, PostgreSQL } from "@codemirror/lang-sql";
import { upperKeywords } from "./upperKeywords";

/** SQL 编辑器,填满容器高度。运行按钮在结果栏,这里只保留 ⌘↵ 快捷键。 */
export function SqlEditor(props: {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  dark?: boolean;
}) {
  return (
    <div style={{ height: "100%", overflow: "auto" }}
         onKeyDown={(e) => { if (e.metaKey && e.key === "Enter") { e.preventDefault(); props.onRun(); } }}>
      <CodeMirror
        value={props.value}
        height="100%"
        style={{ height: "100%" }}
        theme={props.dark ? "dark" : "light"}
        extensions={[sql({ dialect: PostgreSQL }), upperKeywords]}
        onChange={props.onChange}
      />
    </div>
  );
}
