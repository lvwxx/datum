/**
 * 计算每列最终渲染宽度,使结果表自适应结果区宽度。
 *
 * - 内容比容器窄:把多余宽度按比例分配给「可伸缩」列(默认全部;若给了
 *   flexible 标记,则只伸缩文本列,数字/布尔等保持紧凑),正好铺满容器。
 * - 内容比容器宽:保持各列内容宽度(横向滚动,绝不压缩到内容以下)。
 * - 手动拖拽过的列固定不动,其余列自适应剩余空间。
 * - 单列结果(如 EXPLAIN):取容器宽的一半(不小于 defaultW),不铺满,便于换行查看。
 *
 * @param autoWidths 各列按内容估算的宽度(下限)
 * @param manual     手动拖拽设定的列宽(下标 → 宽度),覆盖自适应
 * @param containerW 结果区可视宽度;0 表示未知
 * @param defaultW   兜底/单列下限宽度
 * @param flexible   可选:各列是否可伸缩(通常左对齐文本列为 true)
 */
export function columnWidths(
  autoWidths: number[],
  manual: Record<number, number>,
  containerW: number,
  defaultW: number,
  flexible?: boolean[],
): number[] {
  const n = autoWidths.length;
  if (n === 1) {
    const w = manual[0] ?? (containerW > 0 ? Math.max(defaultW, Math.floor(containerW * 0.5)) : (autoWidths[0] ?? defaultW));
    return [w];
  }

  const base = autoWidths.map((a, i) => manual[i] ?? a ?? defaultW);
  const total = base.reduce((s, w) => s + w, 0);
  const surplus = containerW - total;
  if (containerW <= 0 || surplus <= 0) return base;

  // 伸缩目标:未手动调整的列;若提供 flexible 则仅其中可伸缩的列,全无则回退到全部
  const auto = base.map((_, i) => i).filter((i) => manual[i] == null);
  let targets = flexible ? auto.filter((i) => flexible[i]) : auto;
  if (targets.length === 0) targets = auto;
  if (targets.length === 0) return base;

  const targetTotal = targets.reduce((s, i) => s + base[i], 0);
  const out = base.slice();
  let used = 0;
  targets.forEach((i, k) => {
    const add = k === targets.length - 1 ? surplus - used : Math.round(surplus * (base[i] / targetTotal));
    out[i] = base[i] + add;
    used += add;
  });
  return out;
}
