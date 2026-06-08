export function ObjectTree(props: {
  tables: string[];
  active: string | null;
  onSelect: (t: string) => void;
}) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: "4px 0" }}>
      {props.tables.map((t) => (
        <li key={t}
            onClick={() => props.onSelect(t)}
            style={{
              padding: "3px 8px 3px 24px", cursor: "pointer", fontSize: 12,
              background: t === props.active ? "var(--selection)" : "transparent",
            }}>
          <span style={{ color: "var(--fg-muted)", marginRight: 4 }}>▦</span><span>{t}</span>
        </li>
      ))}
    </ul>
  );
}
