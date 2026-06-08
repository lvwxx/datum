import CodeMirror from "@uiw/react-codemirror";
import { sql, PostgreSQL } from "@codemirror/lang-sql";

/** 只读 SQL 展示,带语法高亮,跟随主题。 */
export function SqlView(props: { value: string; dark?: boolean; height?: string }) {
  return (
    <CodeMirror
      value={props.value}
      height={props.height ?? "100%"}
      theme={props.dark ? "dark" : "light"}
      editable={false}
      basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: false }}
      extensions={[sql({ dialect: PostgreSQL })]}
    />
  );
}
