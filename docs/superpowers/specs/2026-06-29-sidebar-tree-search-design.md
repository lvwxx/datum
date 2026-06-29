# 侧边栏：新版 Datum 树形重做 + 连接/表搜索

日期：2026-06-29

## 背景

最新的 Datum 设计稿（`Datum Multi-DB.dc.html`）把侧边栏从「连接卡片 + 平铺表列表」升级为带展开箭头、连接状态点、env 徽章的树。本次按该稿重做侧边栏，并新增一个搜索框，可搜索已配置的连接和已连接库的表。

数据模型不变：**一个 `name` = 一个连接 = 一个库**。不做同名聚合，也不做后端多库枚举。因此树为两级：连接 → 表。中栏、右栏（breadcrumb / tabs / 编辑器 / 结果区 / 状态栏）保持现状，不在本次范围内。

## 目标

1. 侧边栏按新版样式重做：展开箭头、连接状态点、env 徽章、缩进表列表。
2. 支持多个连接同时展开，各自懒加载并缓存自己的表。
3. 新增搜索框，实时过滤连接与（已加载的）表。
4. 编辑/删除连接收敛到右键菜单，去掉行内铅笔按钮。

## 非目标

- 不实现「一台服务器多个库」的后端枚举。
- 不改中栏/右栏布局，不改结果表格的灰阶配色或 JetBrains Mono 字体。
- 不新增 env 类型（保持 local / staging / prod）。

## 设计

### 1. 侧边栏布局（自上而下）

- **标题行**（保持）：`连接` + `+` 新建按钮。
- **搜索框**（新增）：标题下方。
  - 容器 `margin: 0 8px 8px`，相对定位。
  - 左侧放大镜图标（lucide `Search`，15px，`--fg-faint`），绝对定位 `left: 11px`，`pointer-events: none`。
  - `<input>`：`height: 32px`，`padding: 0 12px 0 34px`，底色 `--raised-bg`，无边框，圆角 `9999px`，字号 13px，占位符 **`搜索连接 / 表`**。
  - 受控组件，值存于 App 本地 state（`query`），实时过滤。带一个清空（输入非空时显示 `x` 小按钮，可选；最简实现可省略，靠键盘清空）。
- **树区**（滚动）：连接行 + 展开后的表列表。

### 2. 连接行（ConnectionList）

每个连接一行，结构（`display:flex; gap:8px; height:34px; padding:0 10px 0 8px; borderRadius:4px`）：

| 元素 | 说明 |
|---|---|
| 展开箭头 | lucide `ChevronRight`，12px，`--fg-faint`；展开时 `transform: rotate(90deg)`，`transition: transform .12s`。 |
| 库图标 | 关系型用 `Database`，Redis 用 `KeyRound`；展开时 `--fg-soft`，收起时 `--fg-faint`。 |
| 名称 | 13px / 700，`--fg`，`flex:1`，中间省略（沿用 `MiddleEllipsis`）。 |
| 状态点 | 7px 圆点：已连接 = 实心 `--accent`；未连接 = 透明底 + `inset 0 0 0 1.5px --fg-faint`（空心环）。 |
| env 徽章 | 现有徽章样式（env 色描边 + 文字），保持。 |

- 整行 `.side-row` 悬停高亮；**去掉行内铅笔按钮**。
- 点击整行 = 切换展开/收起（同时把该连接设为 `activeId`，用于 breadcrumb 与新建 tab 的归属）。
- 右键 → 现有「编辑 / 删除」菜单。

### 3. 表列表（ObjectTree）

- 展开的连接下方渲染其表列表，整体左缩进（表行 `padding: 0 10px 0 44px`，与设计稿对齐）。
- 表行：表图标（lucide `Table`，13px）+ 表名（13px）。
- 激活表（当前 tab 的表且属于该连接）：加粗 + 高亮底 + 左侧 3px 绿条（沿用现有）。
- 右键 → 现有「复制表名 / 查看建表语句」（Redis：复制 key 名）。

### 4. 状态管理（store.ts）

把「全局只存一个 active 连接的表」改为按连接缓存 + 多展开：

```ts
interface AppStore {
  connections: Connection[];
  activeId: string | null;                 // 当前聚焦连接(breadcrumb / 新 tab 归属)
  expandedConns: Record<string, boolean>;  // 哪些连接已展开
  tablesByConn: Record<string, string[]>;  // 每个连接已加载的表/key 列表(缓存)
  connectedIds: Record<string, boolean>;   // 已成功连接过的连接(状态点)
  activeTable: string | null;
  dirtyEdits: ...;
  // actions
  setConnections, setExpanded(id, bool), setTables(id, string[]),
  markConnected(id), activate(id), selectTable, stageEdit, clearEdits
}
```

- 「已连接」判定：`setTables(id, ...)` 成功时 `markConnected(id)`。删除连接时清理对应的 `expandedConns / tablesByConn / connectedIds`。

### 5. App.tsx 行为

- **展开连接**（首次）：按 kind 连接并 `list`/`scan` 表，写入 `tablesByConn[id]`，`markConnected(id)`；失败则展开为空并保持未连接。已缓存则直接展开。
- **点击表**：`onSelectTable(connId, table)` 显式带连接 id（不再依赖全局 activeId），按所属连接打开/复用 tab。逻辑与现有 `onSelectTable` 相同，仅参数化连接。
- **activeId**：点击连接行时更新，供 breadcrumb 与默认归属使用。

### 6. 搜索过滤

App 内根据 `query`（trim、忽略大小写）计算每个连接的展示：

- `query` 为空 → 按 `expandedConns` 正常展示。
- 非空：
  - **连接名命中** → 显示该连接；其表列表按是否展开/是否有缓存正常显示（命中连接本身不强制过滤表）。
  - **表名命中**（仅在 `tablesByConn[id]` 有缓存的连接里查）→ 强制展开该连接，仅渲染命中的表。
  - 两者都不命中的连接 → 隐藏。
  - 未加载表的连接：只能按连接名命中；不会为搜索自动连接所有库。
- 过滤只影响渲染，不改写 `expandedConns`（清空搜索即恢复原展开状态）。

## 影响文件

- `src/state/store.ts` — 新状态结构与 actions。
- `src/App.tsx` — 展开/搜索/点表逻辑、搜索框、ConnectionList/ObjectTree 接线。
- `src/components/Sidebar/ConnectionList.tsx` — 箭头、状态点、去铅笔、整行点击展开。
- `src/components/Sidebar/ObjectTree.tsx` — 缩进微调（基本沿用）。
- `src/theme/theme.css` — 搜索框 / 状态点相关样式（如需要）。
- 相关测试：`ConnectionList.test.tsx`、`ObjectTree.test.tsx`、`store.test.ts` 同步更新。

## 测试

- store：`setExpanded` / `setTables` / `markConnected` 行为；删除连接清理缓存。
- ConnectionList：渲染箭头/状态点/徽章；点击切换展开；无铅笔按钮。
- 搜索：连接名命中、表名命中（仅已加载）、未加载连接只按名字命中、清空恢复。
