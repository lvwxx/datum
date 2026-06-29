# Datum

一款简约现代的桌面数据库管理工具,支持 **PostgreSQL** 与 **Redis**。基于 Tauri 2 + React + TypeScript 构建,体积小、启动快。

<img width="3504" height="1960" alt="image" src="https://github.com/user-attachments/assets/671b93b7-1a68-42e3-83b4-1b10f34d603f" />

<img width="3308" height="2204" alt="image" src="https://github.com/user-attachments/assets/0c5938f1-321f-4faf-bed2-28578a6cbdcb" />



> Datum(/ˈdeɪtəm/,"data" 的单数)—— 专注于数据的工具。

## 功能

- **连接管理**:新建/编辑/删除连接,按环境(local / staging / prod)着色;凭据按环境路由——`local` 明文存本地、`staging/prod` 存 macOS 钥匙串
- **PostgreSQL**:浏览表、SQL 编辑器(关键字自动大写、运行选中或光标所在语句)、结果表格(固定表头、列宽省略、双击看全文、行高亮、分页)、表详情(字段定义 + 索引)、暂存-确认事务编辑、查看建表语句、复制 INSERT
- **Redis**:浏览 key、按类型(string/hash/list/set/zset)展示值、执行任意命令、查看 key 详情(类型/TTL/大小)
- **界面**:Ayu Light / Mirage 双主题(☀️/🌙 一键切换)、可拖动三栏布局、多标签页、统一提示

## 技术栈

- 桌面框架:**Tauri 2**(Rust 后端 + 系统 WebView)
- 前端:**React 18 + TypeScript + Vite**,SQL 编辑器用 CodeMirror 6,布局用 react-resizable-panels,状态用 Zustand
- 后端驱动:PostgreSQL 用 `tokio-postgres`,Redis 用 `redis-rs`,凭据用 `keyring`

## 环境要求

- **Node.js** ≥ 20(开发用 v24 验证)
- **Rust** ≥ 1.80(开发用 1.95 验证),含 `cargo`
- **macOS**(当前打包目标;Tauri 本身跨平台)
- 跑后端集成测试时需要 **Docker**(或本地可连的 PostgreSQL / Redis)

首次没有 Rust 时安装:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## 开发

```bash
# 1. 安装前端依赖
npm install

# 2. 启动开发模式(热重载,自动编译 Rust 后端并打开窗口)
npm run tauri dev
```

常用脚本:

```bash
npm run dev          # 只起前端 Vite(不含桌面外壳)
npm run build        # 前端 tsc 类型检查 + 构建到 dist/
npm test             # 前端单元测试(Vitest)
```

Rust 单元测试:

```bash
cd src-tauri && cargo test
```

### 集成测试(需要数据库)

集成测试默认标记 `#[ignore]`,只在显式运行时执行,会自行建表/种数据并清理。

```bash
# PostgreSQL:默认连 127.0.0.1:5432(postgres/postgres),或起一个 docker 实例
src-tauri/scripts/test-pg.sh
cd src-tauri && cargo test -- --ignored --test-threads=1

# Redis:默认连 127.0.0.1:6379
src-tauri/scripts/test-redis.sh
cd src-tauri && cargo test rds:: -- --ignored
```

可用环境变量覆盖测试连接:`DBSTUDIO_TEST_PG`(libpq 连接串)、`DBSTUDIO_TEST_REDIS`(redis URL)。

## 打包

```bash
npm run tauri build
```

产物位于 `src-tauri/target/release/bundle/`:

- `dmg/Datum_<版本>_aarch64.dmg` —— 分发给他人的安装包(拖进 Applications 即装)
- `macos/Datum.app` —— 应用本体

> 当前在 Apple Silicon 上构建,产物为 `aarch64`,**仅适用于 M 系列 Mac**。

### 兼容 Intel Mac(通用包,可选)

```bash
rustup target add x86_64-apple-darwin
npm run tauri build -- --target universal-apple-darwin
```

### 关于代码签名(可选)

当前为**未签名**构建。配置了 Apple Developer 签名身份后,`tauri build` 会自动签名;否则接收方需按下方说明绕过 Gatekeeper。

## 安装与使用(发给他人)

1. 双击 `Datum_<版本>_aarch64.dmg`,把 **Datum** 拖进 **Applications**
2. 首次打开如果提示"**已损坏,无法打开**"或"来自身份不明的开发者"——这是因为应用未做苹果签名,**并非真的损坏**。打开「终端」执行一次以下命令解除隔离标记:

   ```bash
   xattr -dr com.apple.quarantine /Applications/Datum.app
   ```

3. 之后正常双击打开即可。

> 仅支持 Apple Silicon(M 系列)Mac;Intel Mac 需使用上面的通用包构建。

### 连接示例

- **PostgreSQL**:新建连接,类型选 PostgreSQL,填主机/端口(默认 5432)/用户/数据库/密码
- **Redis**:类型选 Redis,填主机/端口(默认 6379)/库索引(默认 0),密码可留空

凭据存储:`local` 环境的密码以明文存于配置文件,`staging`/`prod` 环境的密码存入 macOS 钥匙串。配置文件位于:

```
~/Library/Application Support/com.dbstudio.app/connections.json
```

## 项目结构

```
src/                      前端(React + TS)
  api/                    调用后端命令的封装(connections / pg / redis)
  components/             UI 组件(连接列表、SQL 编辑器、结果表格、表详情、Toast 等)
  lib/                    纯函数(SQL 生成、语句切分、剪贴板)
  state/                  Zustand 全局状态
  theme/                  Ayu 主题 token 与切换
src-tauri/                后端(Rust + Tauri)
  src/core/               连接模型、按环境的凭据存储、配置仓库、错误类型
  src/pg/                 PostgreSQL:连接池、浏览、编辑、命令
  src/rds/                Redis:连接、scan、取值、命令
  src/commands.rs         连接 CRUD 的 Tauri 命令
  src/lib.rs              应用入口与命令注册
docs/superpowers/         设计文档与实现计划
```

