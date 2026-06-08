use crate::commands::AppState;
use crate::core::credentials;
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
