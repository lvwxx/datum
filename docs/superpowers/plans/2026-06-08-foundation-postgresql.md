# DBStudio 计划① — 基础骨架 + PostgreSQL 端到端 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭出可运行的 Tauri 桌面应用,具备连接管理(按环境存凭据)、Ayu 双主题、三栏 UI,并实现 PostgreSQL 的连接、浏览表、SQL 查询、暂存-确认行内编辑、表详情——做完是一个能真正使用的 PG 客户端。

**Architecture:** Tauri 2 应用,Rust 后端分 `core`(连接配置、凭据存储、错误类型)与 `pg`(PostgreSQL 驱动)两个模块(方案 A);React + TypeScript 前端通过 Tauri command(IPC)调用后端。本计划不含 SSH 隧道与 Redis(后续计划),PG 连接为直连。

**Tech Stack:** Tauri 2 · Rust(tokio, tokio-postgres, keyring, serde, thiserror)· React 18 + TypeScript + Vite · CodeMirror 6(SQL 编辑器)· 测试:Rust `cargo test` + 前端 Vitest/Testing Library + PG 集成测试用本地 Docker Postgres。

**参照设计文档:** `docs/superpowers/specs/2026-06-08-dbstudio-design.md`

---

## 文件结构

```
dbstudio/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── src/
│       ├── main.rs              # 入口,注册 Tauri commands、初始化 AppState
│       ├── error.rs             # AppError 统一错误类型
│       ├── core/
│       │   ├── mod.rs
│       │   ├── connection.rs    # Connection 模型 + Env 枚举
│       │   ├── credentials.rs   # 按 env 路由的凭据存储(keychain / 明文)
│       │   └── repository.rs    # connections.json 读写
│       ├── pg/
│       │   ├── mod.rs
│       │   ├── client.rs        # 连接池/连接持有、simple_query 封装
│       │   ├── browse.rs        # list_objects / table_detail
│       │   └── edit.rs          # commit_edits(事务批量 UPDATE)
│       └── commands.rs          # 所有 #[tauri::command] 薄封装
├── src/                         # 前端
│   ├── main.tsx
│   ├── App.tsx                  # 三栏布局骨架
│   ├── theme/
│   │   ├── tokens.ts            # Ayu Light / Mirage token 表
│   │   ├── ThemeProvider.tsx    # 注入 CSS 变量 + 切换
│   │   └── theme.css
│   ├── api/
│   │   ├── connections.ts       # 连接 CRUD 的 invoke 封装
│   │   └── pg.ts                # PG 操作的 invoke 封装
│   ├── types.ts                 # 与后端对应的 TS 类型
│   ├── components/
│   │   ├── Sidebar/
│   │   │   ├── ConnectionList.tsx
│   │   │   ├── ConnectionForm.tsx
│   │   │   └── ObjectTree.tsx
│   │   ├── editor/
│   │   │   └── SqlEditor.tsx
│   │   ├── results/
│   │   │   └── ResultGrid.tsx   # 暂存编辑的脏状态在此管理
│   │   └── detail/
│   │       └── TableDetail.tsx
│   └── state/
│       └── store.ts             # 当前连接/对象/暂存改动的全局状态(Zustand)
└── docs/superpowers/...
```

设计单元边界:`core` 不依赖 `pg`;`pg` 依赖 `core`(取连接/凭据);`commands.rs` 是唯一暴露给前端的层。前端 `api/` 是唯一调 `invoke` 的层,组件不直接 `invoke`。

---

## 阶段 A:脚手架

### Task 1: 初始化 Tauri + React + TS 项目

**Files:**
- Create: 整个脚手架(`src-tauri/`、`src/`、`package.json`、`vite.config.ts` 等)

- [ ] **Step 1: 用官方脚手架创建项目到当前目录**

Run:
```bash
cd /Users/biao/workspace/github/dbstudio
npm create tauri-app@latest . -- --template react-ts --manager npm
```
若提示目录非空,选择合并/继续(已有 `docs/`、`.git`、`.gitignore`)。

- [ ] **Step 2: 安装依赖并验证能启动**

Run:
```bash
npm install
npm run tauri dev
```
Expected: 弹出一个 Tauri 窗口显示默认欢迎页。确认后 `Ctrl-C` 关闭。

- [ ] **Step 3: 加入后端依赖**

修改 `src-tauri/Cargo.toml`,在 `[dependencies]` 增加:
```toml
tokio = { version = "1", features = ["rt-multi-thread", "macros", "sync"] }
tokio-postgres = { version = "0.7", features = ["with-chrono-0_4"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
thiserror = "1"
keyring = "2"
```

- [ ] **Step 4: 加入前端依赖**

Run:
```bash
npm install zustand @uiw/react-codemirror @codemirror/lang-sql
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
```

- [ ] **Step 5: 配置 Vitest**

修改 `vite.config.ts`,加入 test 配置:
```ts
/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true, setupFiles: "./src/test-setup.ts" },
  clearScreen: false,
  server: { port: 1420, strictPort: true },
});
```
Create `src/test-setup.ts`:
```ts
import "@testing-library/jest-dom";
```
在 `package.json` 的 `scripts` 加:`"test": "vitest run"`。

- [ ] **Step 6: 验证前端测试管线**

Create `src/smoke.test.ts`:
```ts
import { test, expect } from "vitest";
test("vitest runs", () => { expect(1 + 1).toBe(2); });
```
Run: `npm test`
Expected: 1 passed。随后删除 `src/smoke.test.ts`。

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold tauri + react-ts, add deps and test harness"
```

---

## 阶段 B:Rust core 层(TDD)

### Task 2: AppError 统一错误类型

**Files:**
- Create: `src-tauri/src/error.rs`
- Modify: `src-tauri/src/main.rs`(声明 `mod error;`)
- Test: `src-tauri/src/error.rs`(`#[cfg(test)]`)

- [ ] **Step 1: 写失败测试**

在 `src-tauri/src/error.rs` 写:
```rust
use serde::Serialize;

#[derive(Debug, Serialize, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub kind: ErrorKind,
    pub message: String,
    pub detail: Option<String>,
}

#[derive(Debug, Serialize, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum ErrorKind {
    Connection,
    Query,
    Edit,
    Credential,
    Config,
    NotFound,
}

impl AppError {
    pub fn new(kind: ErrorKind, message: impl Into<String>) -> Self {
        Self { kind, message: message.into(), detail: None }
    }
    pub fn with_detail(mut self, detail: impl Into<String>) -> Self {
        self.detail = Some(detail.into());
        self
    }
}

pub type AppResult<T> = Result<T, AppError>;

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn serializes_to_camel_case_json() {
        let e = AppError::new(ErrorKind::Query, "boom").with_detail("syntax error");
        let v = serde_json::to_value(&e).unwrap();
        assert_eq!(v["kind"], "query");
        assert_eq!(v["message"], "boom");
        assert_eq!(v["detail"], "syntax error");
    }
}
```

- [ ] **Step 2: 声明模块**

在 `src-tauri/src/main.rs` 顶部加 `mod error;`。

- [ ] **Step 3: 运行测试确认通过**

Run: `cd src-tauri && cargo test error:: -- --nocapture`
Expected: `serializes_to_camel_case_json ... ok`

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/error.rs src-tauri/src/main.rs
git commit -m "feat(core): add AppError type with serde camelCase"
```

### Task 3: Connection 模型与 Env 枚举

**Files:**
- Create: `src-tauri/src/core/mod.rs`, `src-tauri/src/core/connection.rs`
- Modify: `src-tauri/src/main.rs`(`mod core;`)
- Test: `src-tauri/src/core/connection.rs`

- [ ] **Step 1: 写失败测试**

`src-tauri/src/core/connection.rs`:
```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum DbKind { Pg, Redis }

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum Env { Local, Staging, Prod }

impl Env {
    /// 仅 Local 把密码明文存本地;其余走钥匙串。
    pub fn stores_password_in_plaintext(&self) -> bool {
        matches!(self, Env::Local)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Connection {
    pub id: String,
    pub name: String,
    pub kind: DbKind,
    pub env: Env,
    pub host: String,
    pub port: u16,
    pub user: String,
    pub database: String,
    /// 仅当 env == Local 时这里才有明文密码;否则为 None(密码在钥匙串)。
    #[serde(default)]
    pub plaintext_password: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn local_stores_plaintext_other_envs_do_not() {
        assert!(Env::Local.stores_password_in_plaintext());
        assert!(!Env::Staging.stores_password_in_plaintext());
        assert!(!Env::Prod.stores_password_in_plaintext());
    }
    #[test]
    fn roundtrips_json() {
        let c = Connection {
            id: "c1".into(), name: "prod-pg".into(), kind: DbKind::Pg, env: Env::Prod,
            host: "db.example.com".into(), port: 5432, user: "app".into(),
            database: "appdb".into(), plaintext_password: None,
        };
        let json = serde_json::to_string(&c).unwrap();
        let back: Connection = serde_json::from_str(&json).unwrap();
        assert_eq!(c, back);
    }
}
```

- [ ] **Step 2: 创建 core 模块声明**

`src-tauri/src/core/mod.rs`:
```rust
pub mod connection;
pub mod credentials;
pub mod repository;
```
在 `src-tauri/src/main.rs` 加 `mod core;`。
(此时 `credentials`/`repository` 还不存在,下一步会创建占位以便编译;现在先临时只写 `pub mod connection;`,后续任务再补全 `mod.rs`。)

实际操作:本步只在 `mod.rs` 写 `pub mod connection;`。

- [ ] **Step 3: 运行测试确认通过**

Run: `cd src-tauri && cargo test connection:: `
Expected: 两个测试 ok。

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/core src-tauri/src/main.rs
git commit -m "feat(core): add Connection model and Env routing rule"
```

### Task 4: 凭据存储(按 env 路由)

**Files:**
- Create: `src-tauri/src/core/credentials.rs`
- Modify: `src-tauri/src/core/mod.rs`(加 `pub mod credentials;`)
- Test: `src-tauri/src/core/credentials.rs`

设计:定义 `CredentialStore` trait,真实实现 `KeyringStore` 走 `keyring` crate;测试用内存假实现验证**按 env 路由**逻辑(local 不进 keychain)。路由逻辑独立于具体后端,便于测试。

- [ ] **Step 1: 写失败测试**

`src-tauri/src/core/credentials.rs`:
```rust
use crate::core::connection::Connection;
use crate::error::{AppError, AppResult, ErrorKind};

/// 后端无关的密钥串抽象,便于测试替换。
pub trait SecretBackend {
    fn set(&self, service: &str, account: &str, secret: &str) -> AppResult<()>;
    fn get(&self, service: &str, account: &str) -> AppResult<Option<String>>;
    fn delete(&self, service: &str, account: &str) -> AppResult<()>;
}

const SERVICE: &str = "com.dbstudio.app";

fn account_key(conn: &Connection) -> String {
    format!("{}:{}", conn.env_label(), conn.id)
}

/// 保存密码:Local 写进 connection 的明文字段(由调用方持久化到 json);
/// 其余环境写进密钥串后端。返回"应持久化到 json 的 connection"(明文字段已按规则设置)。
pub fn save_password<B: SecretBackend>(
    backend: &B, mut conn: Connection, password: &str,
) -> AppResult<Connection> {
    if conn.env.stores_password_in_plaintext() {
        conn.plaintext_password = Some(password.to_string());
    } else {
        conn.plaintext_password = None;
        backend.set(SERVICE, &account_key(&conn), password)
            .map_err(|e| e)?;
    }
    Ok(conn)
}

/// 取密码:Local 从明文字段;其余从密钥串。
pub fn load_password<B: SecretBackend>(backend: &B, conn: &Connection) -> AppResult<String> {
    if conn.env.stores_password_in_plaintext() {
        conn.plaintext_password.clone()
            .ok_or_else(|| AppError::new(ErrorKind::Credential, "本地连接缺少明文密码"))
    } else {
        backend.get(SERVICE, &account_key(conn))?
            .ok_or_else(|| AppError::new(ErrorKind::Credential, "钥匙串中未找到该连接的密码"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::connection::{DbKind, Env};
    use std::cell::RefCell;
    use std::collections::HashMap;

    #[derive(Default)]
    struct FakeBackend { store: RefCell<HashMap<String, String>> }
    impl SecretBackend for FakeBackend {
        fn set(&self, _s: &str, a: &str, secret: &str) -> AppResult<()> {
            self.store.borrow_mut().insert(a.into(), secret.into()); Ok(())
        }
        fn get(&self, _s: &str, a: &str) -> AppResult<Option<String>> {
            Ok(self.store.borrow().get(a).cloned())
        }
        fn delete(&self, _s: &str, a: &str) -> AppResult<()> {
            self.store.borrow_mut().remove(a); Ok(())
        }
    }

    fn conn(env: Env) -> Connection {
        Connection { id: "c1".into(), name: "n".into(), kind: DbKind::Pg, env,
            host: "h".into(), port: 5432, user: "u".into(), database: "d".into(),
            plaintext_password: None }
    }

    #[test]
    fn local_keeps_plaintext_and_skips_keychain() {
        let b = FakeBackend::default();
        let saved = save_password(&b, conn(Env::Local), "pw").unwrap();
        assert_eq!(saved.plaintext_password.as_deref(), Some("pw"));
        assert!(b.store.borrow().is_empty()); // 没进钥匙串
        assert_eq!(load_password(&b, &saved).unwrap(), "pw");
    }

    #[test]
    fn prod_uses_keychain_and_clears_plaintext() {
        let b = FakeBackend::default();
        let saved = save_password(&b, conn(Env::Prod), "pw").unwrap();
        assert_eq!(saved.plaintext_password, None);
        assert_eq!(b.store.borrow().len(), 1); // 进了钥匙串
        assert_eq!(load_password(&b, &saved).unwrap(), "pw");
    }
}
```

- [ ] **Step 2: 给 Connection 加 `env_label` 辅助方法**

在 `src-tauri/src/core/connection.rs` 的 `impl Connection`(若无则新建)加:
```rust
impl Connection {
    pub fn env_label(&self) -> &'static str {
        match self.env { Env::Local => "local", Env::Staging => "staging", Env::Prod => "prod" }
    }
}
```

- [ ] **Step 3: 在 mod.rs 暴露模块**

`src-tauri/src/core/mod.rs` 改为:
```rust
pub mod connection;
pub mod credentials;
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd src-tauri && cargo test credentials::`
Expected: 两个测试 ok。

- [ ] **Step 5: 实现真实 KeyringStore(无单测,留集成手测)**

在 `credentials.rs` 末尾加:
```rust
pub struct KeyringBackend;
impl SecretBackend for KeyringBackend {
    fn set(&self, service: &str, account: &str, secret: &str) -> AppResult<()> {
        keyring::Entry::new(service, account)
            .and_then(|e| e.set_password(secret))
            .map_err(|e| AppError::new(ErrorKind::Credential, "写入钥匙串失败").with_detail(e.to_string()))
    }
    fn get(&self, service: &str, account: &str) -> AppResult<Option<String>> {
        match keyring::Entry::new(service, account).and_then(|e| e.get_password()) {
            Ok(p) => Ok(Some(p)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(AppError::new(ErrorKind::Credential, "读取钥匙串失败").with_detail(e.to_string())),
        }
    }
    fn delete(&self, service: &str, account: &str) -> AppResult<()> {
        match keyring::Entry::new(service, account).and_then(|e| e.delete_credential()) {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(AppError::new(ErrorKind::Credential, "删除钥匙串项失败").with_detail(e.to_string())),
        }
    }
}
```

- [ ] **Step 6: 确认整体编译**

Run: `cd src-tauri && cargo build`
Expected: 编译通过(可能有未使用告警,可忽略)。

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/core
git commit -m "feat(core): env-routed credential storage (plaintext for local, keychain otherwise)"
```

### Task 5: 连接仓库(connections.json 读写)

**Files:**
- Create: `src-tauri/src/core/repository.rs`
- Modify: `src-tauri/src/core/mod.rs`(加 `pub mod repository;`)
- Test: `src-tauri/src/core/repository.rs`

- [ ] **Step 1: 写失败测试**

`src-tauri/src/core/repository.rs`:
```rust
use crate::core::connection::Connection;
use crate::error::{AppError, AppResult, ErrorKind};
use std::path::{Path, PathBuf};

/// 负责把连接列表读写到 connections.json(一个目录下的固定文件名)。
pub struct ConnectionRepo { path: PathBuf }

impl ConnectionRepo {
    pub fn new(config_dir: &Path) -> Self {
        Self { path: config_dir.join("connections.json") }
    }

    pub fn load(&self) -> AppResult<Vec<Connection>> {
        if !self.path.exists() { return Ok(vec![]); }
        let bytes = std::fs::read(&self.path)
            .map_err(|e| AppError::new(ErrorKind::Config, "读取配置失败").with_detail(e.to_string()))?;
        serde_json::from_slice(&bytes)
            .map_err(|e| AppError::new(ErrorKind::Config, "解析配置失败").with_detail(e.to_string()))
    }

    pub fn save(&self, conns: &[Connection]) -> AppResult<()> {
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| AppError::new(ErrorKind::Config, "创建配置目录失败").with_detail(e.to_string()))?;
        }
        let json = serde_json::to_vec_pretty(conns)
            .map_err(|e| AppError::new(ErrorKind::Config, "序列化配置失败").with_detail(e.to_string()))?;
        std::fs::write(&self.path, json)
            .map_err(|e| AppError::new(ErrorKind::Config, "写入配置失败").with_detail(e.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::connection::{DbKind, Env};

    fn sample() -> Connection {
        Connection { id: "c1".into(), name: "local-pg".into(), kind: DbKind::Pg, env: Env::Local,
            host: "127.0.0.1".into(), port: 5432, user: "postgres".into(),
            database: "postgres".into(), plaintext_password: Some("pw".into()) }
    }

    #[test]
    fn load_missing_file_returns_empty() {
        let dir = std::env::temp_dir().join(format!("dbstudio-test-{}", std::process::id()));
        let repo = ConnectionRepo::new(&dir);
        assert_eq!(repo.load().unwrap().len(), 0);
    }

    #[test]
    fn save_then_load_roundtrips() {
        let dir = std::env::temp_dir().join(format!("dbstudio-rt-{}", std::process::id()));
        let repo = ConnectionRepo::new(&dir);
        repo.save(&[sample()]).unwrap();
        let loaded = repo.load().unwrap();
        assert_eq!(loaded.len(), 1);
        assert_eq!(loaded[0].name, "local-pg");
        std::fs::remove_dir_all(&dir).ok();
    }
}
```

- [ ] **Step 2: 在 mod.rs 暴露**

`src-tauri/src/core/mod.rs` 改为含 `pub mod repository;`。

- [ ] **Step 3: 运行测试确认通过**

Run: `cd src-tauri && cargo test repository::`
Expected: 两个测试 ok。

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/core
git commit -m "feat(core): connections.json repository with load/save"
```

---

## 阶段 C:连接 CRUD 命令 + AppState

### Task 6: AppState 与连接 CRUD 命令

**Files:**
- Create: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/main.rs`

说明:`AppState` 持有配置目录路径与 keyring 后端。命令做 CRUD,密码经 `credentials` 模块按 env 路由。`list_connections` 返回时**抹掉明文密码**以免泄露给前端(前端不需要密码)。

- [ ] **Step 1: 写 commands.rs**

`src-tauri/src/commands.rs`:
```rust
use crate::core::connection::Connection;
use crate::core::credentials::{self, KeyringBackend};
use crate::core::repository::ConnectionRepo;
use crate::error::{AppError, AppResult, ErrorKind};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct AppState {
    pub config_dir: PathBuf,
    pub backend: KeyringBackend,
    pub lock: Mutex<()>, // 串行化配置文件写入
}

impl AppState {
    fn repo(&self) -> ConnectionRepo { ConnectionRepo::new(&self.config_dir) }
}

/// 返回给前端的连接(永远不含密码)。
fn sanitize(mut c: Connection) -> Connection { c.plaintext_password = None; c }

#[tauri::command]
pub fn list_connections(state: tauri::State<AppState>) -> AppResult<Vec<Connection>> {
    let conns = state.repo().load()?;
    Ok(conns.into_iter().map(sanitize).collect())
}

#[tauri::command]
pub fn save_connection(
    state: tauri::State<AppState>, conn: Connection, password: Option<String>,
) -> AppResult<Connection> {
    let _g = state.lock.lock().unwrap();
    let mut all = state.repo().load()?;
    // 若提供了新密码则按 env 路由保存
    let stored = match password {
        Some(pw) => credentials::save_password(&state.backend, conn, &pw)?,
        None => conn, // 编辑时未改密码:沿用(local 的明文需由前端回传,见前端任务)
    };
    match all.iter().position(|c| c.id == stored.id) {
        Some(i) => all[i] = stored.clone(),
        None => all.push(stored.clone()),
    }
    state.repo().save(&all)?;
    Ok(sanitize(stored))
}

#[tauri::command]
pub fn delete_connection(state: tauri::State<AppState>, id: String) -> AppResult<()> {
    let _g = state.lock.lock().unwrap();
    let mut all = state.repo().load()?;
    let before = all.len();
    all.retain(|c| c.id != id);
    if all.len() == before {
        return Err(AppError::new(ErrorKind::NotFound, "连接不存在"));
    }
    state.repo().save(&all)
}
```

- [ ] **Step 2: 在 main.rs 注册 state 与命令**

`src-tauri/src/main.rs` 改为(保留 Tauri 默认模板的其余部分):
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod error;
mod core;
mod commands;
mod pg;

use commands::AppState;
use std::sync::Mutex;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let config_dir = app.path().app_config_dir()
                .expect("无法获取应用配置目录");
            app.manage(AppState {
                config_dir,
                backend: crate::core::credentials::KeyringBackend,
                lock: Mutex::new(()),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_connections,
            commands::save_connection,
            commands::delete_connection,
            pg::commands::pg_connect,
            pg::commands::pg_list_objects,
            pg::commands::pg_query,
            pg::commands::pg_table_detail,
            pg::commands::pg_commit_edits,
        ])
        .run(tauri::generate_context!())
        .expect("启动 Tauri 失败");
}
```
注意:`use tauri::Manager;` 可能需要为 `app.path()`/`app.manage()` 引入——若编译报错,在文件顶部加 `use tauri::Manager;`。`pg` 模块在阶段 E 创建;为先让本任务编译通过,可暂时注释掉 `mod pg;` 与 `invoke_handler` 中的 5 个 `pg::` 项,在阶段 E 再放开。

- [ ] **Step 3: 编译验证(暂注释 pg 相关)**

Run: `cd src-tauri && cargo build`
Expected: 编译通过。

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src
git commit -m "feat: AppState and connection CRUD tauri commands"
```

---

## 阶段 D:前端骨架(主题 + 三栏 + 连接管理)

### Task 7: TS 类型与 Ayu 主题 token

**Files:**
- Create: `src/types.ts`, `src/theme/tokens.ts`
- Test: `src/theme/tokens.test.ts`

- [ ] **Step 1: 写 types.ts**

`src/types.ts`:
```ts
export type DbKind = "pg" | "redis";
export type Env = "local" | "staging" | "prod";

export interface Connection {
  id: string;
  name: string;
  kind: DbKind;
  env: Env;
  host: string;
  port: number;
  user: string;
  database: string;
  plaintextPassword?: string | null;
}

export interface AppError {
  kind: "connection" | "query" | "edit" | "credential" | "config" | "notFound";
  message: string;
  detail?: string | null;
}
```

- [ ] **Step 2: 写失败测试**

`src/theme/tokens.test.ts`:
```ts
import { test, expect } from "vitest";
import { THEMES } from "./tokens";

test("both themes expose the same token keys", () => {
  const light = Object.keys(THEMES.light).sort();
  const dark = Object.keys(THEMES.mirage).sort();
  expect(light).toEqual(dark);
});

test("ayu light accent is amber", () => {
  expect(THEMES.light["--accent"].toLowerCase()).toBe("#ff9940");
});
```

- [ ] **Step 3: 写 tokens.ts**

`src/theme/tokens.ts`(取值来自设计文档 2.5 的 token 表):
```ts
export type ThemeName = "light" | "mirage";
export type Tokens = Record<string, string>;

export const THEMES: Record<ThemeName, Tokens> = {
  light: {
    "--bg": "#FCFCFC", "--bg-panel": "#F3F4F5", "--border": "#E7EAED",
    "--fg": "#5C6166", "--fg-muted": "#ABADB1", "--accent": "#FF9940",
    "--selection": "#D3E1F5", "--dirty-bg": "#FFF0DD",
    "--syn-keyword": "#FA8D3E", "--syn-string": "#86B300", "--syn-entity": "#399EE6",
    "--syn-type": "#55B4D4", "--syn-const": "#A37ACC", "--syn-operator": "#ED9366",
    "--error": "#E65050",
    "--env-prod": "#E65050", "--env-staging": "#FA8D3E", "--env-local": "#4CBF99",
  },
  mirage: {
    "--bg": "#1F2430", "--bg-panel": "#1C212B", "--border": "#3A4151",
    "--fg": "#CCCAC2", "--fg-muted": "#6C7A8B", "--accent": "#FFCC66",
    "--selection": "#33415E", "--dirty-bg": "#3A3A28",
    "--syn-keyword": "#FFAD66", "--syn-string": "#D5FF80", "--syn-entity": "#73D0FF",
    "--syn-type": "#5CCFE6", "--syn-const": "#DFBFFF", "--syn-operator": "#F29E74",
    "--error": "#FF6666",
    "--env-prod": "#FF6666", "--env-staging": "#FFAD66", "--env-local": "#95E6CB",
  },
};
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tokens`
Expected: 2 passed。

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/theme/tokens.ts src/theme/tokens.test.ts
git commit -m "feat(ui): Ayu theme tokens and shared TS types"
```

### Task 8: ThemeProvider(注入 CSS 变量 + 切换)

**Files:**
- Create: `src/theme/ThemeProvider.tsx`, `src/theme/theme.css`
- Test: `src/theme/ThemeProvider.test.tsx`

- [ ] **Step 1: 写失败测试**

`src/theme/ThemeProvider.test.tsx`:
```tsx
import { test, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./ThemeProvider";

function Probe() {
  const { name, toggle } = useTheme();
  return <button onClick={toggle}>theme:{name}</button>;
}

test("defaults to light and applies accent var to root", () => {
  render(<ThemeProvider><Probe /></ThemeProvider>);
  expect(screen.getByText("theme:light")).toBeInTheDocument();
  expect(document.documentElement.style.getPropertyValue("--accent")).toBe("#FF9940");
});

test("toggle switches to mirage and updates the var", () => {
  render(<ThemeProvider><Probe /></ThemeProvider>);
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByText("theme:mirage")).toBeInTheDocument();
  expect(document.documentElement.style.getPropertyValue("--accent")).toBe("#FFCC66");
});
```

- [ ] **Step 2: 写实现**

`src/theme/ThemeProvider.tsx`:
```tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { THEMES, ThemeName } from "./tokens";

interface ThemeCtx { name: ThemeName; toggle: () => void; }
const Ctx = createContext<ThemeCtx | null>(null);

function applyTokens(name: ThemeName) {
  const tokens = THEMES[name];
  for (const [k, v] of Object.entries(tokens)) {
    document.documentElement.style.setProperty(k, v);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState<ThemeName>(
    () => (localStorage.getItem("theme") as ThemeName) || "light"
  );
  useEffect(() => { applyTokens(name); localStorage.setItem("theme", name); }, [name]);
  const toggle = () => setName((n) => (n === "light" ? "mirage" : "light"));
  return <Ctx.Provider value={{ name, toggle }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTheme must be inside ThemeProvider");
  return c;
}
```

`src/theme/theme.css`:
```css
:root { color-scheme: light dark; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
}
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
```

- [ ] **Step 3: 运行测试确认通过**

Run: `npm test -- ThemeProvider`
Expected: 2 passed。

- [ ] **Step 4: Commit**

```bash
git add src/theme
git commit -m "feat(ui): ThemeProvider injecting Ayu CSS variables with toggle"
```

### Task 9: 前端 API 封装(连接 CRUD)

**Files:**
- Create: `src/api/connections.ts`
- Test: `src/api/connections.test.ts`(mock `@tauri-apps/api/core`)

- [ ] **Step 1: 写失败测试**

`src/api/connections.test.ts`:
```ts
import { test, expect, vi, beforeEach } from "vitest";

const invoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...a: unknown[]) => invoke(...a) }));

import { listConnections, saveConnection, deleteConnection } from "./connections";

beforeEach(() => invoke.mockReset());

test("listConnections calls list_connections", async () => {
  invoke.mockResolvedValue([]);
  await listConnections();
  expect(invoke).toHaveBeenCalledWith("list_connections");
});

test("saveConnection passes conn and password", async () => {
  invoke.mockResolvedValue({ id: "c1" });
  const conn = { id: "c1", name: "n", kind: "pg", env: "prod", host: "h",
    port: 5432, user: "u", database: "d" } as const;
  await saveConnection(conn, "secret");
  expect(invoke).toHaveBeenCalledWith("save_connection", { conn, password: "secret" });
});

test("deleteConnection passes id", async () => {
  invoke.mockResolvedValue(undefined);
  await deleteConnection("c1");
  expect(invoke).toHaveBeenCalledWith("delete_connection", { id: "c1" });
});
```

- [ ] **Step 2: 写实现**

`src/api/connections.ts`:
```ts
import { invoke } from "@tauri-apps/api/core";
import type { Connection } from "../types";

export const listConnections = () => invoke<Connection[]>("list_connections");

export const saveConnection = (conn: Connection, password?: string) =>
  invoke<Connection>("save_connection", { conn, password });

export const deleteConnection = (id: string) =>
  invoke<void>("delete_connection", { id });
```

- [ ] **Step 3: 运行测试确认通过**

Run: `npm test -- connections`
Expected: 3 passed。

- [ ] **Step 4: Commit**

```bash
git add src/api/connections.ts src/api/connections.test.ts
git commit -m "feat(ui): connection CRUD api wrappers"
```

### Task 10: 全局 store(Zustand)

**Files:**
- Create: `src/state/store.ts`
- Test: `src/state/store.test.ts`

store 持有:连接列表、当前激活连接 id、当前选中对象(表名)、暂存改动 `dirtyEdits`(见 PG 编辑)。本任务先实现连接/选中部分。

- [ ] **Step 1: 写失败测试**

`src/state/store.test.ts`:
```ts
import { test, expect, beforeEach } from "vitest";
import { useStore } from "./store";

beforeEach(() => useStore.setState({ connections: [], activeId: null, activeTable: null }));

test("setConnections and activate", () => {
  const c = { id: "c1", name: "n", kind: "pg", env: "local", host: "h",
    port: 5432, user: "u", database: "d" } as const;
  useStore.getState().setConnections([c]);
  useStore.getState().activate("c1");
  expect(useStore.getState().connections).toHaveLength(1);
  expect(useStore.getState().activeId).toBe("c1");
});

test("selectTable sets activeTable", () => {
  useStore.getState().selectTable("users");
  expect(useStore.getState().activeTable).toBe("users");
});
```

- [ ] **Step 2: 写实现**

`src/state/store.ts`:
```ts
import { create } from "zustand";
import type { Connection } from "../types";

interface AppStore {
  connections: Connection[];
  activeId: string | null;
  activeTable: string | null;
  setConnections: (c: Connection[]) => void;
  activate: (id: string) => void;
  selectTable: (t: string | null) => void;
}

export const useStore = create<AppStore>((set) => ({
  connections: [],
  activeId: null,
  activeTable: null,
  setConnections: (connections) => set({ connections }),
  activate: (activeId) => set({ activeId, activeTable: null }),
  selectTable: (activeTable) => set({ activeTable }),
}));
```

- [ ] **Step 3: 运行测试确认通过**

Run: `npm test -- store`
Expected: 2 passed。

- [ ] **Step 4: Commit**

```bash
git add src/state
git commit -m "feat(ui): zustand app store for connections and selection"
```

### Task 11: 三栏布局骨架 + 连接列表/表单

**Files:**
- Create: `src/components/Sidebar/ConnectionList.tsx`, `src/components/Sidebar/ConnectionForm.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`
- Test: `src/components/Sidebar/ConnectionList.test.tsx`

- [ ] **Step 1: 写失败测试(连接列表渲染 + 环境角标)**

`src/components/Sidebar/ConnectionList.test.tsx`:
```tsx
import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConnectionList } from "./ConnectionList";
import type { Connection } from "../../types";

const conns: Connection[] = [
  { id: "c1", name: "prod-pg", kind: "pg", env: "prod", host: "h", port: 5432, user: "u", database: "d" },
];

test("renders connection name and env badge", () => {
  render(<ConnectionList connections={conns} activeId={null} onPick={() => {}} />);
  expect(screen.getByText("prod-pg")).toBeInTheDocument();
  expect(screen.getByText("PROD")).toBeInTheDocument();
});
```

- [ ] **Step 2: 写 ConnectionList**

`src/components/Sidebar/ConnectionList.tsx`:
```tsx
import type { Connection, Env } from "../../types";

const envVar: Record<Env, string> = {
  local: "var(--env-local)", staging: "var(--env-staging)", prod: "var(--env-prod)",
};

export function ConnectionList(props: {
  connections: Connection[];
  activeId: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {props.connections.map((c) => (
        <li key={c.id}
            onClick={() => props.onPick(c.id)}
            style={{
              padding: "6px 8px", cursor: "pointer", display: "flex",
              alignItems: "center", gap: 6,
              background: c.id === props.activeId ? "var(--selection)" : "transparent",
            }}>
          <span>🟢 {c.name}</span>
          <span style={{
            background: envVar[c.env], color: "#fff", fontSize: 9,
            padding: "0 5px", borderRadius: 3,
          }}>{c.env.toUpperCase()}</span>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: 运行测试确认通过**

Run: `npm test -- ConnectionList`
Expected: 1 passed。

- [ ] **Step 4: 写 ConnectionForm(新建/编辑连接表单)**

`src/components/Sidebar/ConnectionForm.tsx`:
```tsx
import { useState } from "react";
import type { Connection, Env } from "../../types";

const blank: Connection = {
  id: "", name: "", kind: "pg", env: "local", host: "127.0.0.1",
  port: 5432, user: "postgres", database: "postgres",
};

export function ConnectionForm(props: {
  initial?: Connection;
  onSubmit: (conn: Connection, password: string) => void;
  onCancel: () => void;
}) {
  const [c, setC] = useState<Connection>(props.initial ?? blank);
  const [pw, setPw] = useState("");
  const upd = (k: keyof Connection, v: string | number) => setC({ ...c, [k]: v });

  return (
    <form onSubmit={(e) => {
        e.preventDefault();
        const id = c.id || crypto.randomUUID();
        props.onSubmit({ ...c, id }, pw);
      }}
      style={{ display: "grid", gap: 6, padding: 8 }}>
      <input placeholder="名称" value={c.name} onChange={(e) => upd("name", e.target.value)} required />
      <select value={c.env} onChange={(e) => upd("env", e.target.value as Env)}>
        <option value="local">local</option>
        <option value="staging">staging</option>
        <option value="prod">prod</option>
      </select>
      <input placeholder="主机" value={c.host} onChange={(e) => upd("host", e.target.value)} />
      <input type="number" placeholder="端口" value={c.port}
             onChange={(e) => upd("port", Number(e.target.value))} />
      <input placeholder="用户" value={c.user} onChange={(e) => upd("user", e.target.value)} />
      <input placeholder="数据库" value={c.database} onChange={(e) => upd("database", e.target.value)} />
      <input type="password" placeholder="密码" value={pw} onChange={(e) => setPw(e.target.value)} />
      <div style={{ display: "flex", gap: 6 }}>
        <button type="submit" style={{ background: "var(--accent)", color: "#fff", border: 0, padding: "4px 10px", borderRadius: 4 }}>保存</button>
        <button type="button" onClick={props.onCancel}>取消</button>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: 写三栏 App.tsx 骨架**

`src/App.tsx`:
```tsx
import { useEffect, useState } from "react";
import { useTheme } from "./theme/ThemeProvider";
import { useStore } from "./state/store";
import { listConnections, saveConnection, deleteConnection } from "./api/connections";
import { ConnectionList } from "./components/Sidebar/ConnectionList";
import { ConnectionForm } from "./components/Sidebar/ConnectionForm";
import type { Connection } from "./types";

export default function App() {
  const { name, toggle } = useTheme();
  const { connections, activeId, setConnections, activate } = useStore();
  const [showForm, setShowForm] = useState(false);

  const refresh = () => listConnections().then(setConnections);
  useEffect(() => { refresh(); }, []);

  const onSubmit = async (conn: Connection, pw: string) => {
    await saveConnection(conn, pw || undefined);
    setShowForm(false);
    refresh();
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* 左栏 */}
      <aside style={{ width: 200, background: "var(--bg-panel)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 8, display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--fg-muted)", fontSize: 10 }}>连接</span>
          <button onClick={() => setShowForm(true)}>＋</button>
        </div>
        <ConnectionList connections={connections} activeId={activeId} onPick={activate} />
        {showForm && <ConnectionForm onSubmit={onSubmit} onCancel={() => setShowForm(false)} />}
        <div style={{ marginTop: "auto", padding: 8 }}>
          <button onClick={toggle}>主题:{name}</button>
        </div>
      </aside>
      {/* 中栏 */}
      <main style={{ flex: 1.5, borderRight: "1px solid var(--border)" }}>
        <div style={{ padding: 12, color: "var(--fg-muted)" }}>选择左侧连接后开始(PG 工作区在后续任务接入)</div>
      </main>
      {/* 右栏 */}
      <aside style={{ width: 200, background: "var(--bg-panel)" }}>
        <div style={{ padding: 8, color: "var(--fg-muted)", fontSize: 10 }}>详情</div>
      </aside>
    </div>
  );
}
```

`src/main.tsx`(确保用 ThemeProvider 包裹,并引入 theme.css):
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./theme/ThemeProvider";
import "./theme/theme.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider><App /></ThemeProvider>
  </React.StrictMode>
);
```

- [ ] **Step 6: 跑起来手测**

Run: `npm run tauri dev`
手测清单:窗口呈三栏;点 ＋ 出表单;新建一个 `local` 连接(主机 127.0.0.1)保存后出现在列表且带 LOCAL 青色角标;点"主题"按钮在 light/mirage 间切换且整体配色变化;关闭重开后连接仍在(已落 json)、主题被记住。

- [ ] **Step 7: Commit**

```bash
git add src/components src/App.tsx src/main.tsx
git commit -m "feat(ui): three-column shell with connection list/form and theme toggle"
```

---

## 阶段 E:PostgreSQL 模块(Rust,TDD + 集成测试)

集成测试需要本地 Postgres。约定:测试连接 `postgres://postgres:postgres@127.0.0.1:5432/postgres`,通过环境变量 `DBSTUDIO_TEST_PG`(缺省即该串)覆盖。提供脚本起一个 Docker PG。带 `#[ignore]` 标记,默认 `cargo test` 跳过,显式 `cargo test -- --ignored` 才跑。

### Task 12: PG 测试夹具脚本

**Files:**
- Create: `src-tauri/scripts/test-pg.sh`

- [ ] **Step 1: 写脚本**

`src-tauri/scripts/test-pg.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
docker rm -f dbstudio-test-pg 2>/dev/null || true
docker run -d --name dbstudio-test-pg \
  -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
echo "等待 PG 就绪..."
until docker exec dbstudio-test-pg pg_isready -U postgres >/dev/null 2>&1; do sleep 0.5; done
docker exec -u postgres dbstudio-test-pg psql -c \
  "CREATE TABLE IF NOT EXISTS users(id int8 PRIMARY KEY, name text, email text);"
docker exec -u postgres dbstudio-test-pg psql -c \
  "INSERT INTO users VALUES (1,'Alice','a@x.com'),(2,'Bob','b@x.com') ON CONFLICT DO NOTHING;"
echo "就绪。停止用: docker rm -f dbstudio-test-pg"
```
`chmod +x src-tauri/scripts/test-pg.sh`

- [ ] **Step 2: Commit**

```bash
git add src-tauri/scripts/test-pg.sh
git commit -m "test(pg): docker fixture script for integration tests"
```

### Task 13: pg 连接持有与查询(simple_query)

**Files:**
- Create: `src-tauri/src/pg/mod.rs`, `src-tauri/src/pg/client.rs`
- Modify: `src-tauri/src/main.rs`(放开 `mod pg;`)
- Test: `src-tauri/src/pg/client.rs`(`#[ignore]` 集成测试)

设计:`PgPool` 持有按连接 id 缓存的 `tokio_postgres::Client`。用 `simple_query` 执行任意 SQL——服务端把所有值以文本返回,天然适合 GUI 展示。结果类型:
```rust
pub struct QueryResult { pub columns: Vec<String>, pub rows: Vec<Vec<Option<String>>> }
```

- [ ] **Step 1: 写 client.rs(含 QueryResult 与连接逻辑)**

`src-tauri/src/pg/client.rs`:
```rust
use crate::error::{AppError, AppResult, ErrorKind};
use serde::Serialize;
use std::collections::HashMap;
use tokio::sync::Mutex;
use tokio_postgres::{Client, NoTls, SimpleQueryMessage};

#[derive(Debug, Serialize, PartialEq)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<Option<String>>>,
    pub affected: Option<u64>,
}

#[derive(Default)]
pub struct PgPool { clients: Mutex<HashMap<String, Client>> }

impl PgPool {
    /// 用 libpq 连接串建立连接并缓存到 id。
    pub async fn connect(&self, id: &str, conninfo: &str) -> AppResult<()> {
        let (client, connection) = tokio_postgres::connect(conninfo, NoTls).await
            .map_err(|e| AppError::new(ErrorKind::Connection, "连接 PostgreSQL 失败").with_detail(e.to_string()))?;
        tokio::spawn(async move { let _ = connection.await; });
        self.clients.lock().await.insert(id.to_string(), client);
        Ok(())
    }

    pub async fn is_connected(&self, id: &str) -> bool {
        self.clients.lock().await.contains_key(id)
    }

    /// 执行任意 SQL,文本协议返回。
    pub async fn query(&self, id: &str, sql: &str) -> AppResult<QueryResult> {
        let guard = self.clients.lock().await;
        let client = guard.get(id)
            .ok_or_else(|| AppError::new(ErrorKind::Connection, "连接未建立,请先连接"))?;
        let msgs = client.simple_query(sql).await
            .map_err(|e| AppError::new(ErrorKind::Query, "查询失败").with_detail(e.to_string()))?;

        let mut columns: Vec<String> = vec![];
        let mut rows: Vec<Vec<Option<String>>> = vec![];
        let mut affected: Option<u64> = None;
        for m in msgs {
            match m {
                SimpleQueryMessage::Row(r) => {
                    if columns.is_empty() {
                        columns = r.columns().iter().map(|c| c.name().to_string()).collect();
                    }
                    let row = (0..r.len()).map(|i| r.get(i).map(|s| s.to_string())).collect();
                    rows.push(row);
                }
                SimpleQueryMessage::CommandComplete(n) => affected = Some(n),
                _ => {}
            }
        }
        Ok(QueryResult { columns, rows, affected })
    }
}
```

`src-tauri/src/pg/mod.rs`:
```rust
pub mod client;
pub mod browse;
pub mod edit;
pub mod commands;
```

在 `src-tauri/src/main.rs` 放开 `mod pg;`(若之前注释过)。

- [ ] **Step 2: 写集成测试(放在 client.rs 末尾)**

```rust
#[cfg(test)]
mod tests {
    use super::*;
    fn conninfo() -> String {
        std::env::var("DBSTUDIO_TEST_PG")
            .unwrap_or_else(|_| "host=127.0.0.1 port=5432 user=postgres password=postgres dbname=postgres".into())
    }

    #[tokio::test]
    #[ignore]
    async fn connects_and_queries_users() {
        let pool = PgPool::default();
        pool.connect("t", &conninfo()).await.unwrap();
        assert!(pool.is_connected("t").await);
        let r = pool.query("t", "SELECT id, name FROM users ORDER BY id").await.unwrap();
        assert_eq!(r.columns, vec!["id", "name"]);
        assert_eq!(r.rows[0], vec![Some("1".into()), Some("Alice".into())]);
    }

    #[tokio::test]
    #[ignore]
    async fn query_error_surfaces_as_app_error() {
        let pool = PgPool::default();
        pool.connect("t", &conninfo()).await.unwrap();
        let err = pool.query("t", "SELECT * FROM no_such_table").await.unwrap_err();
        assert_eq!(err.kind, ErrorKind::Query);
    }
}
```

- [ ] **Step 3: 起夹具并跑集成测试**

Run:
```bash
src-tauri/scripts/test-pg.sh
cd src-tauri && cargo test pg::client -- --ignored --nocapture
```
Expected: `connects_and_queries_users ... ok`、`query_error_surfaces_as_app_error ... ok`

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/pg src-tauri/src/main.rs
git commit -m "feat(pg): connection pool and simple_query-based query execution"
```

### Task 14: 浏览(list_objects / table_detail)

**Files:**
- Create: `src-tauri/src/pg/browse.rs`
- Test: `src-tauri/src/pg/browse.rs`(`#[ignore]`)

- [ ] **Step 1: 写 browse.rs**

`src-tauri/src/pg/browse.rs`:
```rust
use crate::error::AppResult;
use crate::pg::client::PgPool;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ColumnInfo { pub name: String, pub data_type: String, pub is_pk: bool }

#[derive(Debug, Serialize)]
pub struct TableDetail { pub columns: Vec<ColumnInfo> }

/// 列出 public schema 下的表名。
pub async fn list_tables(pool: &PgPool, id: &str) -> AppResult<Vec<String>> {
    let r = pool.query(id,
        "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename").await?;
    Ok(r.rows.into_iter().filter_map(|row| row.into_iter().next().flatten()).collect())
}

/// 表详情:列名、类型、是否主键。
pub async fn table_detail(pool: &PgPool, id: &str, table: &str) -> AppResult<TableDetail> {
    // 列与类型
    let cols = pool.query(id, &format!(
        "SELECT column_name, data_type FROM information_schema.columns \
         WHERE table_schema='public' AND table_name='{}' ORDER BY ordinal_position",
        escape_literal(table))).await?;
    // 主键列集合
    let pks = pool.query(id, &format!(
        "SELECT a.attname FROM pg_index i \
         JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey) \
         WHERE i.indrelid='public.{}'::regclass AND i.indisprimary",
        escape_ident(table))).await?;
    let pk_set: std::collections::HashSet<String> =
        pks.rows.into_iter().filter_map(|r| r.into_iter().next().flatten()).collect();

    let columns = cols.rows.into_iter().map(|r| {
        let name = r.get(0).cloned().flatten().unwrap_or_default();
        let data_type = r.get(1).cloned().flatten().unwrap_or_default();
        let is_pk = pk_set.contains(&name);
        ColumnInfo { name, data_type, is_pk }
    }).collect();
    Ok(TableDetail { columns })
}

/// 转义标识符内的双引号(用于 ::regclass 文本)。
fn escape_ident(s: &str) -> String { s.replace('"', "\"\"") }
/// 转义字符串字面量中的单引号。
fn escape_literal(s: &str) -> String { s.replace('\'', "''") }

#[cfg(test)]
mod tests {
    use super::*;
    fn conninfo() -> String {
        std::env::var("DBSTUDIO_TEST_PG")
            .unwrap_or_else(|_| "host=127.0.0.1 port=5432 user=postgres password=postgres dbname=postgres".into())
    }
    #[tokio::test]
    #[ignore]
    async fn lists_users_table_and_detail() {
        let pool = PgPool::default();
        pool.connect("t", &conninfo()).await.unwrap();
        let tables = list_tables(&pool, "t").await.unwrap();
        assert!(tables.contains(&"users".to_string()));
        let detail = table_detail(&pool, "t", "users").await.unwrap();
        let id_col = detail.columns.iter().find(|c| c.name == "id").unwrap();
        assert!(id_col.is_pk);
    }
}
```

- [ ] **Step 2: 跑集成测试**

Run: `cd src-tauri && cargo test pg::browse -- --ignored`
Expected: `lists_users_table_and_detail ... ok`

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/pg/browse.rs
git commit -m "feat(pg): list tables and table detail (columns, types, pk)"
```

### Task 15: 暂存-确认编辑(事务批量 UPDATE)

**Files:**
- Create: `src-tauri/src/pg/edit.rs`
- Test: `src-tauri/src/pg/edit.rs`(`#[ignore]`)

设计:前端传一批 `CellEdit { table, pk_col, pk_value, column, new_value }`。后端在**单事务**内对每条生成 `UPDATE "table" SET "column" = $1 WHERE "pk_col" = $2`,用参数绑定(防注入)。值统一以文本传入并用 `::text` 转换到目标列——为兼容非文本列,采用 `SET "col" = $1` 并依赖 PG 隐式转换;若失败由错误回传(v1 支持标量列,复杂类型如数组/json 以文本编辑,记为已知限制)。全部成功 commit,任一失败 rollback。

需要在 `PgPool` 暴露一个能取可变 client 跑事务的方法。

- [ ] **Step 1: 给 PgPool 加事务执行入口**

在 `src-tauri/src/pg/client.rs` 的 `impl PgPool` 增加:
```rust
    /// 在一个事务里执行闭包(用于批量编辑)。
    pub async fn with_txn<F>(&self, id: &str, edits: &[crate::pg::edit::CellEdit]) -> AppResult<u64>
    where F: Sized {
        let mut guard = self.clients.lock().await;
        let client = guard.get_mut(id)
            .ok_or_else(|| AppError::new(ErrorKind::Connection, "连接未建立,请先连接"))?;
        let txn = client.transaction().await
            .map_err(|e| AppError::new(ErrorKind::Edit, "开启事务失败").with_detail(e.to_string()))?;
        let mut n = 0u64;
        for e in edits {
            let sql = format!(
                "UPDATE \"{}\" SET \"{}\" = $1 WHERE \"{}\" = $2",
                e.table.replace('"', "\"\""),
                e.column.replace('"', "\"\""),
                e.pk_col.replace('"', "\"\""));
            let affected = txn.execute(&sql, &[&e.new_value, &e.pk_value]).await
                .map_err(|err| AppError::new(ErrorKind::Edit, "更新失败").with_detail(err.to_string()))?;
            n += affected;
        }
        txn.commit().await
            .map_err(|e| AppError::new(ErrorKind::Edit, "提交事务失败").with_detail(e.to_string()))?;
        Ok(n)
    }
```
(注:`F` 泛型未使用,简化为去掉 `<F>` 与 where。最终签名应为 `pub async fn with_txn(&self, id: &str, edits: &[crate::pg::edit::CellEdit]) -> AppResult<u64>`。实现 body 同上。)

- [ ] **Step 2: 写 edit.rs(CellEdit 定义 + 入口函数)**

`src-tauri/src/pg/edit.rs`:
```rust
use crate::error::AppResult;
use crate::pg::client::PgPool;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CellEdit {
    pub table: String,
    pub pk_col: String,
    pub pk_value: String,
    pub column: String,
    pub new_value: String,
}

/// 批量提交:单事务,全成功或全回滚。返回受影响行数。
pub async fn commit_edits(pool: &PgPool, id: &str, edits: &[CellEdit]) -> AppResult<u64> {
    if edits.is_empty() { return Ok(0); }
    pool.with_txn(id, edits).await
}

#[cfg(test)]
mod tests {
    use super::*;
    fn conninfo() -> String {
        std::env::var("DBSTUDIO_TEST_PG")
            .unwrap_or_else(|_| "host=127.0.0.1 port=5432 user=postgres password=postgres dbname=postgres".into())
    }

    #[tokio::test]
    #[ignore]
    async fn commits_a_cell_edit() {
        let pool = PgPool::default();
        pool.connect("t", &conninfo()).await.unwrap();
        let edits = vec![CellEdit {
            table: "users".into(), pk_col: "id".into(), pk_value: "2".into(),
            column: "name".into(), new_value: "Bobby".into(),
        }];
        let n = commit_edits(&pool, "t", &edits).await.unwrap();
        assert_eq!(n, 1);
        let r = pool.query("t", "SELECT name FROM users WHERE id=2").await.unwrap();
        assert_eq!(r.rows[0][0].as_deref(), Some("Bobby"));
    }

    #[tokio::test]
    #[ignore]
    async fn bad_edit_rolls_back() {
        let pool = PgPool::default();
        pool.connect("t", &conninfo()).await.unwrap();
        // id 是 int8,写入非数字会失败 → 整批回滚
        let edits = vec![
            CellEdit { table: "users".into(), pk_col: "id".into(), pk_value: "1".into(),
                       column: "email".into(), new_value: "ok@x.com".into() },
            CellEdit { table: "users".into(), pk_col: "id".into(), pk_value: "1".into(),
                       column: "id".into(), new_value: "not-a-number".into() },
        ];
        assert!(commit_edits(&pool, "t", &edits).await.is_err());
        let r = pool.query("t", "SELECT email FROM users WHERE id=1").await.unwrap();
        assert_eq!(r.rows[0][0].as_deref(), Some("a@x.com")); // 第一条也被回滚
    }
}
```

- [ ] **Step 3: 跑集成测试(先重置夹具保证数据干净)**

Run:
```bash
src-tauri/scripts/test-pg.sh
cd src-tauri && cargo test pg::edit -- --ignored --test-threads=1
```
Expected: `commits_a_cell_edit ... ok`、`bad_edit_rolls_back ... ok`

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/pg/edit.rs src-tauri/src/pg/client.rs
git commit -m "feat(pg): staged-commit cell edits in a single transaction"
```

### Task 16: PG Tauri 命令封装

**Files:**
- Create: `src-tauri/src/pg/commands.rs`
- Modify: `src-tauri/src/main.rs`(`AppState` 增加 `pg_pool`;放开 invoke_handler 中 5 个 pg 命令)、`src-tauri/src/commands.rs`(AppState 加字段)

- [ ] **Step 1: 给 AppState 加 PgPool**

修改 `src-tauri/src/commands.rs` 的 `AppState`:
```rust
use crate::pg::client::PgPool;
// ...
pub struct AppState {
    pub config_dir: PathBuf,
    pub backend: KeyringBackend,
    pub lock: Mutex<()>,
    pub pg_pool: PgPool,
}
```
并在 `main.rs` 的 `app.manage(AppState { ... })` 里加 `pg_pool: PgPool::default(),`。

- [ ] **Step 2: 写 pg/commands.rs**

`src-tauri/src/pg/commands.rs`:
```rust
use crate::commands::AppState;
use crate::core::credentials::{self};
use crate::error::{AppError, AppResult, ErrorKind};
use crate::pg::browse::{self, TableDetail};
use crate::pg::client::QueryResult;
use crate::pg::edit::{self, CellEdit};

/// 用连接 id 找到配置 + 密码,建立 PG 连接。
#[tauri::command]
pub async fn pg_connect(state: tauri::State<'_, AppState>, id: String) -> AppResult<()> {
    let conns = crate::core::repository::ConnectionRepo::new(&state.config_dir).load()?;
    let conn = conns.into_iter().find(|c| c.id == id)
        .ok_or_else(|| AppError::new(ErrorKind::NotFound, "连接不存在"))?;
    let password = credentials::load_password(&state.backend, &conn)?;
    let conninfo = format!(
        "host={} port={} user={} password={} dbname={}",
        conn.host, conn.port, conn.user, password, conn.database);
    state.pg_pool.connect(&id, &conninfo).await
}

#[tauri::command]
pub async fn pg_list_objects(state: tauri::State<'_, AppState>, id: String) -> AppResult<Vec<String>> {
    browse::list_tables(&state.pg_pool, &id).await
}

#[tauri::command]
pub async fn pg_query(state: tauri::State<'_, AppState>, id: String, sql: String) -> AppResult<QueryResult> {
    state.pg_pool.query(&id, &sql).await
}

#[tauri::command]
pub async fn pg_table_detail(state: tauri::State<'_, AppState>, id: String, table: String) -> AppResult<TableDetail> {
    browse::table_detail(&state.pg_pool, &id, &table).await
}

#[tauri::command]
pub async fn pg_commit_edits(state: tauri::State<'_, AppState>, id: String, edits: Vec<CellEdit>) -> AppResult<u64> {
    edit::commit_edits(&state.pg_pool, &id, &edits).await
}
```

- [ ] **Step 3: 编译**

Run: `cd src-tauri && cargo build`
Expected: 通过。

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src
git commit -m "feat(pg): tauri commands for connect/list/query/detail/commit"
```

---

## 阶段 F:PG 前端接入

### Task 17: PG api 封装 + store 暂存编辑

**Files:**
- Create: `src/api/pg.ts`
- Modify: `src/state/store.ts`(加 dirtyEdits)
- Test: `src/api/pg.test.ts`, `src/state/store.test.ts`(新增用例)

- [ ] **Step 1: 写 pg api 失败测试**

`src/api/pg.test.ts`:
```ts
import { test, expect, vi, beforeEach } from "vitest";
const invoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...a: unknown[]) => invoke(...a) }));
import { pgConnect, pgListObjects, pgQuery, pgTableDetail, pgCommitEdits } from "./pg";
beforeEach(() => invoke.mockReset());

test("pgQuery passes id and sql", async () => {
  invoke.mockResolvedValue({ columns: [], rows: [], affected: null });
  await pgQuery("c1", "SELECT 1");
  expect(invoke).toHaveBeenCalledWith("pg_query", { id: "c1", sql: "SELECT 1" });
});

test("pgCommitEdits passes edits array", async () => {
  invoke.mockResolvedValue(1);
  const edits = [{ table: "users", pkCol: "id", pkValue: "2", column: "name", newValue: "X" }];
  await pgCommitEdits("c1", edits);
  expect(invoke).toHaveBeenCalledWith("pg_commit_edits", { id: "c1", edits });
});
```

- [ ] **Step 2: 写 pg.ts**

`src/api/pg.ts`:
```ts
import { invoke } from "@tauri-apps/api/core";

export interface QueryResult {
  columns: string[];
  rows: (string | null)[][];
  affected: number | null;
}
export interface ColumnInfo { name: string; dataType: string; isPk: boolean; }
export interface TableDetail { columns: ColumnInfo[]; }
export interface CellEdit {
  table: string; pkCol: string; pkValue: string; column: string; newValue: string;
}

export const pgConnect = (id: string) => invoke<void>("pg_connect", { id });
export const pgListObjects = (id: string) => invoke<string[]>("pg_list_objects", { id });
export const pgQuery = (id: string, sql: string) => invoke<QueryResult>("pg_query", { id, sql });
export const pgTableDetail = (id: string, table: string) =>
  invoke<TableDetail>("pg_table_detail", { id, table });
export const pgCommitEdits = (id: string, edits: CellEdit[]) =>
  invoke<number>("pg_commit_edits", { id, edits });
```

- [ ] **Step 3: 给 store 加 dirtyEdits**

在 `src/state/store.ts` 的 `AppStore` 接口与实现里增加(键为 `行pk|列名`):
```ts
// 接口里加:
  dirtyEdits: Record<string, import("../api/pg").CellEdit>;
  stageEdit: (e: import("../api/pg").CellEdit) => void;
  clearEdits: () => void;
// 实现里加:
  dirtyEdits: {},
  stageEdit: (e) => set((s) => ({
    dirtyEdits: { ...s.dirtyEdits, [`${e.pkValue}|${e.column}`]: e },
  })),
  clearEdits: () => set({ dirtyEdits: {} }),
```
并把 `beforeEach` 重置补上 `dirtyEdits: {}`。

- [ ] **Step 4: store 新增测试**

在 `src/state/store.test.ts` 加:
```ts
test("stageEdit accumulates and clearEdits resets", () => {
  const e = { table: "users", pkCol: "id", pkValue: "2", column: "name", newValue: "X" };
  useStore.getState().stageEdit(e);
  expect(Object.keys(useStore.getState().dirtyEdits)).toHaveLength(1);
  useStore.getState().clearEdits();
  expect(useStore.getState().dirtyEdits).toEqual({});
});
```

- [ ] **Step 5: 运行测试**

Run: `npm test -- pg store`
Expected: 全部 passed。

- [ ] **Step 6: Commit**

```bash
git add src/api/pg.ts src/api/pg.test.ts src/state/store.ts src/state/store.test.ts
git commit -m "feat(ui): pg api wrappers and staged-edit state"
```

### Task 18: ObjectTree(左栏表树)

**Files:**
- Create: `src/components/Sidebar/ObjectTree.tsx`
- Test: `src/components/Sidebar/ObjectTree.test.tsx`

- [ ] **Step 1: 写失败测试**

`src/components/Sidebar/ObjectTree.test.tsx`:
```tsx
import { test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ObjectTree } from "./ObjectTree";

test("renders tables and fires onSelect", () => {
  const onSelect = vi.fn();
  render(<ObjectTree tables={["users", "orders"]} active={null} onSelect={onSelect} />);
  expect(screen.getByText("users")).toBeInTheDocument();
  fireEvent.click(screen.getByText("orders"));
  expect(onSelect).toHaveBeenCalledWith("orders");
});
```

- [ ] **Step 2: 写实现**

`src/components/Sidebar/ObjectTree.tsx`:
```tsx
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
            }}>▦ {t}</li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: 运行测试**

Run: `npm test -- ObjectTree`
Expected: 1 passed。

- [ ] **Step 4: Commit**

```bash
git add src/components/Sidebar/ObjectTree.tsx src/components/Sidebar/ObjectTree.test.tsx
git commit -m "feat(ui): object tree for tables"
```

### Task 19: SqlEditor(CodeMirror)

**Files:**
- Create: `src/components/editor/SqlEditor.tsx`
- Test: `src/components/editor/SqlEditor.test.tsx`

- [ ] **Step 1: 写失败测试**

`src/components/editor/SqlEditor.test.tsx`:
```tsx
import { test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SqlEditor } from "./SqlEditor";

test("renders run button and fires onRun", () => {
  const onRun = vi.fn();
  render(<SqlEditor value="SELECT 1" onChange={() => {}} onRun={onRun} />);
  fireEvent.click(screen.getByText(/运行/));
  expect(onRun).toHaveBeenCalled();
});
```

- [ ] **Step 2: 写实现**

`src/components/editor/SqlEditor.tsx`:
```tsx
import CodeMirror from "@uiw/react-codemirror";
import { sql, PostgreSQL } from "@codemirror/lang-sql";

export function SqlEditor(props: {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "6px 8px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--border)" }}>
        <span style={{ color: "var(--fg-muted)", fontSize: 10 }}>⌨ SQL</span>
        <button onClick={props.onRun}
          style={{ background: "var(--accent)", color: "#fff", border: 0, borderRadius: 4, padding: "2px 10px", fontSize: 11 }}>
          ▶ 运行 ⌘↵
        </button>
      </div>
      <CodeMirror
        value={props.value}
        height="160px"
        extensions={[sql({ dialect: PostgreSQL })]}
        onChange={props.onChange}
        onKeyDown={(e) => { if (e.metaKey && e.key === "Enter") { e.preventDefault(); props.onRun(); } }}
      />
    </div>
  );
}
```

- [ ] **Step 3: 运行测试**

Run: `npm test -- SqlEditor`
Expected: 1 passed。
(注:CodeMirror 在 jsdom 下渲染有限,测试只验证运行按钮;编辑体验在 `tauri dev` 手测。)

- [ ] **Step 4: Commit**

```bash
git add src/components/editor
git commit -m "feat(ui): SQL editor with CodeMirror and run button"
```

### Task 20: ResultGrid(结果表格 + 暂存编辑)

**Files:**
- Create: `src/components/results/ResultGrid.tsx`
- Test: `src/components/results/ResultGrid.test.tsx`

设计:接收 `QueryResult` + 主键列名;双击单元格变输入框,改值后 onStage 一条 CellEdit 并把该格标脏(`--dirty-bg` 底 + `--accent` 边)。`⌘S` 触发 onCommit。无主键时编辑禁用并提示。

- [ ] **Step 1: 写失败测试**

`src/components/results/ResultGrid.test.tsx`:
```tsx
import { test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResultGrid } from "./ResultGrid";

const result = { columns: ["id", "name"], rows: [["1", "Alice"], ["2", "Bob"]], affected: null };

test("double click cell edits and stages on change", () => {
  const onStage = vi.fn();
  render(<ResultGrid result={result} pkCol="id" dirtyKeys={new Set()} onStage={onStage} onCommit={() => {}} />);
  fireEvent.doubleClick(screen.getByText("Bob"));
  const input = screen.getByDisplayValue("Bob");
  fireEvent.change(input, { target: { value: "Bobby" } });
  fireEvent.blur(input);
  expect(onStage).toHaveBeenCalledWith(
    expect.objectContaining({ pkValue: "2", column: "name", newValue: "Bobby" })
  );
});

test("shows pk warning when pkCol is null", () => {
  render(<ResultGrid result={result} pkCol={null} dirtyKeys={new Set()} onStage={() => {}} onCommit={() => {}} />);
  expect(screen.getByText(/无主键/)).toBeInTheDocument();
});
```

- [ ] **Step 2: 写实现**

`src/components/results/ResultGrid.tsx`:
```tsx
import { useState } from "react";
import type { QueryResult, CellEdit } from "../../api/pg";

export function ResultGrid(props: {
  result: QueryResult;
  pkCol: string | null;
  dirtyKeys: Set<string>;
  onStage: (e: Omit<CellEdit, "table">) => void;
  onCommit: () => void;
}) {
  const { columns, rows } = props.result;
  const pkIndex = props.pkCol ? columns.indexOf(props.pkCol) : -1;
  const [editing, setEditing] = useState<{ r: number; c: number } | null>(null);

  const onCellChange = (rowIdx: number, colIdx: number, value: string) => {
    if (pkIndex < 0) return;
    const pkValue = rows[rowIdx][pkIndex] ?? "";
    props.onStage({ pkCol: props.pkCol!, pkValue, column: columns[colIdx], newValue: value });
  };

  return (
    <div tabIndex={0}
         onKeyDown={(e) => { if (e.metaKey && e.key.toLowerCase() === "s") { e.preventDefault(); props.onCommit(); } }}
         style={{ padding: 8, outline: "none" }}>
      {props.pkCol === null &&
        <div style={{ color: "var(--error)", fontSize: 11, marginBottom: 6 }}>该结果无主键,暂不可编辑</div>}
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
        <thead>
          <tr style={{ color: "var(--fg-muted)", textAlign: "left" }}>
            {columns.map((c) => <th key={c} style={{ padding: 4, fontWeight: 500 }}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ borderTop: "1px solid var(--border)" }}>
              {row.map((cell, ci) => {
                const pkValue = pkIndex >= 0 ? row[pkIndex] ?? "" : "";
                const dirty = props.dirtyKeys.has(`${pkValue}|${columns[ci]}`);
                const isEditing = editing?.r === ri && editing?.c === ci;
                return (
                  <td key={ci}
                      onDoubleClick={() => props.pkCol && setEditing({ r: ri, c: ci })}
                      style={{
                        padding: 4,
                        background: dirty ? "var(--dirty-bg)" : "transparent",
                        border: dirty ? "1px solid var(--accent)" : undefined,
                      }}>
                    {isEditing ? (
                      <input autoFocus defaultValue={cell ?? ""}
                        onBlur={(e) => { onCellChange(ri, ci, e.target.value); setEditing(null); }}
                        style={{ width: "100%", font: "inherit" }} />
                    ) : (cell ?? <span style={{ color: "var(--fg-muted)" }}>NULL</span>)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: 运行测试**

Run: `npm test -- ResultGrid`
Expected: 2 passed。

- [ ] **Step 4: Commit**

```bash
git add src/components/results
git commit -m "feat(ui): result grid with double-click staged editing and cmd+s commit"
```

### Task 21: TableDetail(右栏)

**Files:**
- Create: `src/components/detail/TableDetail.tsx`
- Test: `src/components/detail/TableDetail.test.tsx`

- [ ] **Step 1: 写失败测试**

`src/components/detail/TableDetail.test.tsx`:
```tsx
import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TableDetail } from "./TableDetail";

test("renders columns with pk marker", () => {
  render(<TableDetail detail={{ columns: [
    { name: "id", dataType: "bigint", isPk: true },
    { name: "name", dataType: "text", isPk: false },
  ] }} table="users" />);
  expect(screen.getByText("users")).toBeInTheDocument();
  expect(screen.getByText(/PK/)).toBeInTheDocument();
  expect(screen.getByText("name")).toBeInTheDocument();
});
```

- [ ] **Step 2: 写实现**

`src/components/detail/TableDetail.tsx`:
```tsx
import type { TableDetail as Detail } from "../../api/pg";

export function TableDetail(props: { detail: Detail; table: string }) {
  return (
    <div style={{ padding: 8 }}>
      <div style={{ color: "var(--fg-muted)", fontSize: 10, textTransform: "uppercase" }}>
        表详情 · {props.table}
      </div>
      <div className="mono" style={{ marginTop: 8, fontSize: 11, lineHeight: 1.7 }}>
        {props.detail.columns.map((c) => (
          <div key={c.name}>
            <span style={{ color: "var(--syn-entity)" }}>{c.name}</span>{" "}
            <span style={{ color: "var(--syn-type)" }}>{c.dataType}</span>
            {c.isPk && <span style={{ color: "var(--accent)" }}> PK</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 运行测试**

Run: `npm test -- detail`
Expected: 1 passed。

- [ ] **Step 4: Commit**

```bash
git add src/components/detail
git commit -m "feat(ui): table detail panel"
```

### Task 22: 组装 PG 工作区到 App

**Files:**
- Modify: `src/App.tsx`

把中栏接成「上 SqlEditor + 下 ResultGrid」,右栏接 TableDetail,左栏在激活连接后展示 ObjectTree。串起数据流:激活连接→`pgConnect`→`pgListObjects`;点表→`selectTable`→设 SQL 为 `SELECT * FROM 表 LIMIT 200`→`pgQuery`+`pgTableDetail`;改格→`stageEdit`;⌘S→`pgCommitEdits(当前表, 暂存值)`→成功 `clearEdits` 并重查。

- [ ] **Step 1: 重写 App.tsx 中栏/右栏接线**

`src/App.tsx` 替换为:
```tsx
import { useEffect, useState } from "react";
import { useTheme } from "./theme/ThemeProvider";
import { useStore } from "./state/store";
import { listConnections, saveConnection } from "./api/connections";
import { pgConnect, pgListObjects, pgQuery, pgTableDetail, pgCommitEdits,
         QueryResult, TableDetail as Detail } from "./api/pg";
import { ConnectionList } from "./components/Sidebar/ConnectionList";
import { ConnectionForm } from "./components/Sidebar/ConnectionForm";
import { ObjectTree } from "./components/Sidebar/ObjectTree";
import { SqlEditor } from "./components/editor/SqlEditor";
import { ResultGrid } from "./components/results/ResultGrid";
import { TableDetail } from "./components/detail/TableDetail";
import type { Connection } from "./types";

export default function App() {
  const { name, toggle } = useTheme();
  const store = useStore();
  const { connections, activeId, activeTable, dirtyEdits } = store;
  const [showForm, setShowForm] = useState(false);
  const [tables, setTables] = useState<string[]>([]);
  const [sql, setSql] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = () => listConnections().then(store.setConnections);
  useEffect(() => { refresh(); }, []);

  const pkCol = detail?.columns.find((c) => c.isPk)?.name ?? null;
  const dirtyKeys = new Set(Object.keys(dirtyEdits));

  const onActivate = async (id: string) => {
    setErr(null);
    store.activate(id);
    try { await pgConnect(id); setTables(await pgListObjects(id)); }
    catch (e) { setErr(JSON.stringify(e)); }
  };

  const runSql = async () => {
    if (!activeId) return;
    setErr(null);
    try { setResult(await pgQuery(activeId, sql)); }
    catch (e) { setErr(JSON.stringify(e)); }
  };

  const onSelectTable = async (t: string) => {
    if (!activeId) return;
    store.selectTable(t);
    store.clearEdits();
    const q = `SELECT * FROM "${t}" LIMIT 200`;
    setSql(q);
    try {
      setResult(await pgQuery(activeId, q));
      setDetail(await pgTableDetail(activeId, t));
    } catch (e) { setErr(JSON.stringify(e)); }
  };

  const commit = async () => {
    if (!activeId || !activeTable) return;
    const edits = Object.values(dirtyEdits).map((e) => ({ ...e, table: activeTable }));
    try {
      await pgCommitEdits(activeId, edits);
      store.clearEdits();
      setResult(await pgQuery(activeId, sql));
    } catch (e) { setErr(JSON.stringify(e)); }
  };

  const onSubmit = async (conn: Connection, pw: string) => {
    await saveConnection(conn, pw || undefined);
    setShowForm(false); refresh();
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside style={{ width: 200, background: "var(--bg-panel)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 8, display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--fg-muted)", fontSize: 10 }}>连接</span>
          <button onClick={() => setShowForm(true)}>＋</button>
        </div>
        <ConnectionList connections={connections} activeId={activeId} onPick={onActivate} />
        {activeId && <ObjectTree tables={tables} active={activeTable} onSelect={onSelectTable} />}
        {showForm && <ConnectionForm onSubmit={onSubmit} onCancel={() => setShowForm(false)} />}
        <div style={{ marginTop: "auto", padding: 8 }}>
          <button onClick={toggle}>主题:{name}</button>
        </div>
      </aside>

      <main style={{ flex: 1.5, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, minHeight: 0 }}>
          <SqlEditor value={sql} onChange={setSql} onRun={runSql} />
        </div>
        <div style={{ flex: 1.2, minHeight: 0, overflow: "auto" }}>
          {err && <div style={{ color: "var(--error)", padding: 8, fontSize: 11 }}>{err}</div>}
          {result && <ResultGrid result={result} pkCol={pkCol} dirtyKeys={dirtyKeys}
                       onStage={(e) => store.stageEdit(e as any)} onCommit={commit} />}
        </div>
      </main>

      <aside style={{ width: 200, background: "var(--bg-panel)" }}>
        {detail && activeTable
          ? <TableDetail detail={detail} table={activeTable} />
          : <div style={{ padding: 8, color: "var(--fg-muted)", fontSize: 10 }}>详情</div>}
      </aside>
    </div>
  );
}
```

- [ ] **Step 2: 前端测试全过**

Run: `npm test`
Expected: 全部 passed。

- [ ] **Step 3: 端到端手测(需 Docker PG 在跑)**

Run:
```bash
src-tauri/scripts/test-pg.sh   # 起一个本地 PG
npm run tauri dev
```
手测清单:
1. 新建 `local` 连接(host 127.0.0.1 / port 5432 / user postgres / password postgres / database postgres),保存。
2. 点该连接 → 左栏出现 `users` 表。
3. 点 `users` → 中栏上方出现 `SELECT * FROM "users" LIMIT 200`,下方出现两行数据,右栏出现列详情(id 带 PK)。
4. 双击 `Bob` 改成 `Bobby` → 该格变橙(脏)。
5. 按 `⌘S` → 提交成功,表格刷新显示 `Bobby`,橙色消失。
6. 在 SQL 区写 `SELECT * FROM no_such` → 运行 → 中栏下方红字显示错误。
7. 切到暗色主题,确认配色为 Ayu Mirage。

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire PG workspace (tree + sql + results + detail + staged commit)"
```

---

## 完成标准

做完本计划,应用应能:
- 管理 PG 连接,密码按 env 路由(local 明文 / staging·prod 钥匙串)
- 一键切换 Ayu Light / Mirage 主题
- 连接 PG、浏览 public 表、看表详情
- 写 SQL 执行看结果
- 双击单元格暂存编辑、⌘S 单事务批量提交、错误回滚
- 错误以可读信息显示

**不在本计划范围(后续计划):** SSH 隧道、Redis、结果虚拟滚动、多标签页、导出、DDL 编辑、非标量列的结构化编辑。
