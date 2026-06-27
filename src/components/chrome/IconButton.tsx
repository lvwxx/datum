import type { ReactNode, CSSProperties } from "react";

/** 方形幽灵图标按钮:统一尺寸与悬停高亮(.icon-btn)。 */
export function IconButton(props: {
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
  size?: number;
  disabled?: boolean;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const size = props.size ?? 30;
  return (
    <button
      className="icon-btn"
      onClick={props.onClick}
      title={props.title}
      aria-label={props.title}
      disabled={props.disabled}
      style={{ width: size, height: size, flexShrink: 0, ...props.style }}
    >
      {props.children}
    </button>
  );
}
