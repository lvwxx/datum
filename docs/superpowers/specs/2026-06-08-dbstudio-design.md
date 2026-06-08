# DBStudio 设计文档

- 日期:2026-06-08
- 状态:待评审
- 类型:自用数据库 GUI 工具(TablePlus 精简仿写)

## 1. 目标与范围

做一个自用的桌面数据库管理工具,支持 **PostgreSQL** 和 **Redis** 两种数据库。
对标 TablePlus 的核心体验(三栏布局、即时编辑、SQL 编辑器),但只做自己日常用到的功能,砍掉一切用不到的部分。

### 平台与技术栈
- **框架**:Tauri(Rust 后端 + Web 前端)
- **目标平台**:macOS(Tauri 本身跨平台,但 v1 只验证 macOS)
- **PG 驱动**:`sqlx` 或 `tokio-postgres`(Rust)
- **Redis 驱动**:`redis-rs`(Rust)
- **前端**:Web 技术栈(具体框架在实现计划阶段定,倾向 React + Vite 或 Svelte)

### v1 功能范围(MVP)
| 编号 | 功能 |
|------|------|
| A | 连接管理:保存/切换多个 PG/Redis 连接 |
| B | PG:浏览表数据 |
| C | PG:行内编辑(暂存-确认提交,非即时) |
| D | PG:SQL 编辑器(写、执行、看结果) |
| E | Redis:浏览 key(SCAN 模式过滤、按 `:` 折叠树、切 DB) |
| F | Redis:执行命令 |
| G | SSH 隧道:通过跳板机连内网数据库 |

### 明确不做(v1 范围外)
- MySQL / SQLite / MongoDB 等其它数据库
- 主密码加密模式(以后按需加)
- 数据库结构可视化编辑、ER 图、导入向导等高级功能
- 多人协作 / 同步

## 2. UI 布局

经评审确认的**三栏布局**:

```
┌──────────┬─────────────────────────┬──────────────┐
│  左栏    │        中栏             │    右栏      │
│ 连接/对象 │   上:SQL/命令编辑器     │  表/KEY 详情 │
│  树      │   ─────────────────     │              │
│          │   下:结果数据表格       │              │
└──────────┴─────────────────────────┴──────────────┘
```

### 左栏 — 连接 / 对象树
- 列出所有已打开连接,每个连接带**环境角标**:`LOCAL`(青)/`STAGING`/`PROD`(红,显眼防误操作)
- PG:连接 → schema → 表的树
- Redis:连接 → DB → 按 `:` 折叠的 key 命名空间树,顶部有 SCAN 模式过滤框

### 中栏 — 纵向拆分(可拖拽调整比例)
- **上半**:SQL 编辑器(PG)/ 命令输入(Redis),`⌘↵` 运行
- **下半**:结果表格
  - PG:查询结果或表数据,**双击单元格修改 → 暂存(脏单元格高亮)→ `⌘S` 或「提交修改」按钮才写库;「放弃修改」可撤销暂存**
  - Redis:按 value 类型渲染(STRING→文本框、HASH/LIST/SET/ZSET→表格、JSON→高亮);**编辑同样走暂存-确认,`⌘S`/「提交修改」才写入,「放弃修改」撤销**
- **点左栏对象 = 隐式查询**:点 PG 表自动生成 `SELECT * FROM 表`;点 Redis key 自动填 `HGETALL`/`GET` 等并执行

### 右栏 — 详情
- PG:当前表的列 / 索引 / 外键 / DDL
- Redis:当前 key 的类型 / TTL / 内存占用 / 编码,含"设置 TTL""删除 KEY"操作

## 2.5 视觉风格

**整体气质:简约现代风,采用 Ayu 配色** —— 干净、留白充足、克制配色、无多余装饰。强调色为 Ayu 标志性的琥珀橙。

- **双主题,一键切换(同属 Ayu 家族,切换无割裂感)**:
  - **亮色 = Ayu Light**
  - **暗色 = Ayu Mirage**
- **字体**:正文/界面用系统字体(SF / `-apple-system`);SQL 编辑器与结果表格用等宽字体(`ui-monospace`)
- **圆角适中、分区用细线或背景色块区隔,避免重边框;图标线性化、统一风格**
- **脏单元格高亮**:暂存未提交的改动用强调色(橙)描边 + 浅橙底标记,提交后还原;选中行用 selection 蓝底

### 配色 Token

主题以 CSS 变量实现,亮/暗各一套,取值来自官方 Ayu 调色板:

| Token | 用途 | Ayu Light | Ayu Mirage |
|-------|------|-----------|------------|
| `--bg` | 主背景/工作区 | `#FCFCFC` | `#1F2430` |
| `--bg-panel` | 侧栏/详情栏背景 | `#F3F4F5` | `#1C212B` |
| `--border` | 分区线 | `#E7EAED` | `#3A4151` |
| `--fg` | 主文字 | `#5C6166` | `#CCCAC2` |
| `--fg-muted` | 次要文字/标签 | `#ABADB1` | `#6C7A8B` |
| `--accent` | 强调:按钮/选中/可点击 | `#FF9940` | `#FFCC66` |
| `--selection` | 选中行底色 | `#D3E1F5` | `#33415E` |
| `--dirty-bg` | 脏单元格底色 | `#FFF0DD` | `#FFCC6622` |
| `--syn-keyword` | SQL 关键字 | `#FA8D3E` | `#FFAD66` |
| `--syn-string` | 字符串 | `#86B300` | `#D5FF80` |
| `--syn-entity` | 标识符/字段 | `#399EE6` | `#73D0FF` |
| `--syn-type` | 类型 | `#55B4D4` | `#5CCFE6` |
| `--syn-const` | 常量/数字 | `#A37ACC` | `#DFBFFF` |
| `--syn-operator` | 运算符 | `#ED9366` | `#F29E74` |
| `--error` | 错误/危险操作 | `#E65050` | `#FF6666` |

### 环境角标色

| 环境 | 颜色 |
|------|------|
| `PROD` | `#E65050`(红,醒目防误操作) |
| `STAGING` | `#FA8D3E`(橙黄) |
| `LOCAL` | `#4CBF99`(青) |

## 3. 架构(方案 A:两套独立驱动模块)

```
┌─────────────────────────────────────────────┐
│              前端 (Web)                       │
│  - 三栏 UI 组件                               │
│  - 按连接类型路由到对应 Tauri command         │
└───────────────────┬─────────────────────────┘
                    │ Tauri invoke (IPC)
┌───────────────────┴─────────────────────────┐
│              Rust 后端                        │
│  ┌─────────────┐   ┌──────────┐  ┌────────┐ │
│  │  pg 模块    │   │ redis模块 │  │ core   │ │
│  │ pg_connect  │   │redis_scan │  │ 公共层 │ │
│  │ pg_query    │   │redis_get  │  │        │ │
│  │ pg_update_  │   │redis_exec │  │ ·连接  │ │
│  │   cell      │   │redis_set  │  │  配置  │ │
│  │ pg_table_   │   │redis_key_ │  │ ·钥匙串│ │
│  │   detail    │   │  detail   │  │ ·SSH   │ │
│  └─────────────┘   └──────────┘  │ ·错误  │ │
│                                   └────────┘ │
└──────────────────────────────────────────────┘
```

### core 公共层(薄)
- **连接配置模型**:`Connection { id, name, kind: Pg|Redis, env: Local|Staging|Prod, host, port, user, db, ssh_config }`
- **凭据存储**(方案 4 混合 + 按环境区分):
  - `env == Local` → 密码明文存本地配置文件
  - `env == Staging | Prod` → 密码存 macOS 钥匙串(`keyring` crate),配置文件只存引用
  - 非密码信息(host/port/user/ssh 等)一律存本地配置文件
- **SSH 隧道**:建立本地端口转发,数据库连接走隧道(crate 候选:`russh` / `ssh2`)
- **统一错误类型**:后端错误转成结构化错误返回前端

### pg 模块
- `pg_connect`、`pg_list_objects`(schema/表)、`pg_query(sql)`、`pg_commit_edits(table, edits[])`、`pg_table_detail(table)`
- 行内编辑(暂存-确认):前端累积一批改动(每条含主键、列、新值),用户 `⌘S`/「提交修改」时一次性调 `pg_commit_edits`;后端按主键为每条改动生成 `UPDATE`,在**单个事务**内执行,全部成功才提交,任一失败则回滚并返回结构化错误

### redis 模块
- `redis_connect`、`redis_scan(pattern, db)`、`redis_get_key(key)`、`redis_exec(command)`、`redis_commit_edits(edits[])`、`redis_key_detail(key)`、`redis_set_ttl`、`redis_del`
- value 编辑(暂存-确认):前端累积改动,`⌘S`/「提交修改」时调 `redis_commit_edits`,后端用 `MULTI/EXEC` 管线把一批写命令(`HSET`/`SET`/`LSET` 等)原子执行

## 4. 数据流

**浏览 PG 表**:点左栏表 → 前端调 `pg_query("SELECT * FROM t LIMIT n")` → 结果渲染到中栏下半 → 同时调 `pg_table_detail` 填右栏。

**编辑 PG 单元格(暂存-确认)**:双击改值 → 前端把改动记入暂存区、单元格高亮为"脏" → 可继续改多个 → `⌘S`/「提交修改」时把所有暂存改动一次性调 `pg_commit_edits` → 后端在单事务内逐条 `UPDATE`,全成功提交、任一失败回滚 → 成功后清空暂存并刷新;「放弃修改」直接清空暂存还原显示。

**Redis 看 key**:点左栏 key → 调 `redis_get_key` → 按类型渲染中栏下半 + 调 `redis_key_detail` 填右栏。

**编辑 Redis value(暂存-确认)**:改值 → 记入暂存区、高亮为"脏" → 可继续改 → `⌘S`/「提交修改」时一次性调 `redis_commit_edits`,后端 `MULTI/EXEC` 原子执行 → 成功清空暂存并刷新;「放弃修改」清空暂存还原。

**连接建立(带 SSH)**:读连接配置 → 如配了 SSH 先建隧道拿到本地端口 → 用本地端口连数据库 → 凭据按 env 从明文/钥匙串取。

## 5. 错误处理
- 后端所有操作返回 `Result<T, AppError>`,`AppError` 含 `kind`(连接失败/SQL 错误/权限/超时/隧道失败)、`message`、可选 `detail`
- 前端按 `kind` 给出可读提示;PROD 连接的写操作失败要醒目提示
- 连接断开自动检测并在左栏标灰,提供重连

## 6. 测试策略
- **core 层**:单元测试连接配置序列化、凭据按 env 路由(明文 vs 钥匙串)、SSH 配置解析
- **pg 模块**:用 testcontainers / 本地 docker PG 跑集成测试(查询、行内编辑生成的 SQL 正确性、表详情)
- **redis 模块**:本地 docker Redis 集成测试(SCAN、各类型读写、TTL、命令执行)
- **前端**:关键组件(三栏路由、按类型渲染结果)的组件测试
- 优先保证"行内编辑生成的 UPDATE / Redis 写命令"正确,这是误操作风险最高的地方

## 7. 后续可扩展点(非 v1)
- 主密码加密模式
- 更多数据库(届时再评估是否引入 trait 抽象)
- 导出/导入、DDL 编辑
