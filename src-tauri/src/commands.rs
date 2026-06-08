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
    fn repo(&self) -> ConnectionRepo {
        ConnectionRepo::new(&self.config_dir)
    }
}

/// 返回给前端的连接(永远不含密码)。
fn sanitize(mut c: Connection) -> Connection {
    c.plaintext_password = None;
    c
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
        None => conn,
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
