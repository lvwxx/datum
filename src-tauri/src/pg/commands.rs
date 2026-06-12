use crate::commands::AppState;
use crate::core::connection::Connection;
use crate::core::credentials;
use crate::error::{AppError, AppResult, ErrorKind};
use crate::pg::browse::{self, TableDetail};
use crate::pg::client::QueryResult;
use crate::pg::edit::{self, CellEdit};

/// 用显式 setter 构造连接 Config,避免手拼连接串在空密码/特殊字符时丢失 dbname。
fn build_config(conn: &Connection, password: &str) -> tokio_postgres::Config {
    let mut cfg = tokio_postgres::Config::new();
    cfg.host(&conn.host)
        .port(conn.port)
        .user(&conn.user)
        .password(password)
        .dbname(&conn.database);
    cfg
}

/// 用连接 id 找到配置 + 密码,建立 PG 连接。
#[tauri::command]
pub async fn pg_connect(state: tauri::State<'_, AppState>, id: String) -> AppResult<()> {
    let conns = crate::core::repository::ConnectionRepo::new(&state.config_dir).load()?;
    let conn = conns.into_iter().find(|c| c.id == id)
        .ok_or_else(|| AppError::new(ErrorKind::NotFound, "连接不存在"))?;
    let password = credentials::load_password(&state.backend, &conn)?;
    let config = build_config(&conn, &password);
    state.pg_pool.connect(&id, &config).await
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::connection::{DbKind, Env};

    fn conn() -> Connection {
        Connection {
            id: "c1".into(), name: "n".into(), kind: DbKind::Pg, env: Env::Local,
            host: "127.0.0.1".into(), port: 5432, user: "postgres".into(),
            database: "portai-babbage-dev".into(), plaintext_password: None, file_path: None,
        }
    }

    #[test]
    fn build_config_keeps_dbname_with_empty_password() {
        // 回归:空密码不能让 dbname 丢失
        let cfg = build_config(&conn(), "");
        assert_eq!(cfg.get_dbname(), Some("portai-babbage-dev"));
        assert_eq!(cfg.get_user(), Some("postgres"));
        assert_eq!(cfg.get_password(), Some(&b""[..]));
    }
}
