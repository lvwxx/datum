/** 复制文本到剪贴板:优先 Clipboard API,失败回退到 execCommand(免权限)。 */
export function copyToClipboard(text: string): void {
  const fallback = () => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } finally { document.body.removeChild(ta); }
  };
  try {
    navigator.clipboard?.writeText(text).catch(fallback);
  } catch {
    fallback();
  }
}
