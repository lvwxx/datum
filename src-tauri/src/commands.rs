use crate::core::connection::Connection;
use crate::core::credentials::{self, KeyringBackend};
use crate::core::repository::ConnectionRepo;
use crate::error::{AppError, AppResult, ErrorKind};
use crate::pg::client::PgPool;
use crate::rds::client::RedisPool;
use crate::my::client::MyPool;
use crate::sqlite::client::SqlitePool;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct AppState {
    pub config_dir: PathBuf,
    pub backend: KeyringBackend,
    pub lock: Mutex<()>, // 串行化配置文件写入
    pub pg_pool: PgPool,
    pub redis_pool: RedisPool,
    pub my_pool: MyPool,
    pub sqlite_pool: SqlitePool,
}

impl AppState {
    fn repo(&self) -> ConnectionRepo {
        ConnectionRepo::new(&self.config_dir)
    }
}

/// 返回给前端的连接(永远不含密码)。
fn sanitize(mut c: Connection) -> Connection {
    c.plaintext_password = None;
    c
}

/// 编辑时未提供新密码(password=None):沿用已存连接的明文密码。
/// 前端传回的连接已被 sanitize 抹掉密码,直接保存会丢失 local 的明文密码,
/// 故从已存连接里把明文密码带回来(staging/prod 密码在钥匙串,不受影响)。
fn carry_over_password(mut conn: Connection, existing: Option<&Connection>) -> Connection {
    if let Some(e) = existing {
        conn.plaintext_password = e.plaintext_password.clone();
    }
    conn
}

#[tauri::command]
pub fn list_connections(state: tauri::State<AppState>) -> AppResult<Vec<Connection>> {
    let conns = state.repo().load()?;
    Ok(conns.into_iter().map(sanitize).collect())
}

#[tauri::command]
pub fn save_connection(
    state: tauri::State<AppState>,
    conn: Connection,
    password: Option<String>,
) -> AppResult<Connection> {
    let _g = state.lock.lock().unwrap();
    let mut all = state.repo().load()?;
    let stored = match password {
        Some(pw) => credentials::save_password(&state.backend, conn, &pw)?,
        None => {
            let existing = all.iter().find(|c| c.id == conn.id);
            carry_over_password(conn, existing)
        }
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
    let target = all.iter().find(|c| c.id == id).cloned()
        .ok_or_else(|| AppError::new(ErrorKind::NotFound, "连接不存在"))?;
    credentials::delete_password(&state.backend, &target)?;
    all.retain(|c| c.id != id);
    state.repo().save(&all)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::connection::{DbKind, Env};

    fn conn(id: &str, env: Env, pw: Option<&str>) -> Connection {
        Connection {
            id: id.into(), name: "n".into(), kind: DbKind::Pg, env,
            host: "h".into(), port: 5432, user: "u".into(), database: "d".into(),
            plaintext_password: pw.map(|s| s.into()), file_path: None,
        }
    }

    #[test]
    fn carry_over_keeps_local_plaintext_from_existing() {
        // 前端传回的(已 sanitize)连接没有密码
        let incoming = conn("c1", Env::Local, None);
        // 已存连接里有明文密码
        let existing = conn("c1", Env::Local, Some("secret"));
        let merged = carry_over_password(incoming, Some(&existing));
        assert_eq!(merged.plaintext_password.as_deref(), Some("secret"));
    }

    #[test]
    fn carry_over_noop_when_no_existing() {
        let incoming = conn("c1", Env::Local, None);
        let merged = carry_over_password(incoming, None);
        assert_eq!(merged.plaintext_password, None);
    }
}
