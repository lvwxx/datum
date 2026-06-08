/**
 * 中间省略:头部超宽时截断并显示 …,尾部固定字符始终可见。
 * 例如 very_long_table_name_suffix → very_long_t…_suffix
 * 短文本(<= tail + 1)直接整体显示,不截断。
 */
export function MiddleEllipsis({ text, tail = 6 }: { text: string; tail?: number }) {
  if (text.length <= tail + 1) {
    return <span style={{ whiteSpace: "nowrap" }}>{text}</span>;
  }
  const head = text.slice(0, text.length - tail);
  const rest = text.slice(text.length - tail);
  return (
    <span style={{ display: "flex", minWidth: 0, flex: 1, overflow: "hidden" }} title={text}>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{head}</span>
      <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{rest}</span>
    </span>
  );
}
