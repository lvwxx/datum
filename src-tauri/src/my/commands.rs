use crate::commands::AppState;
use crate::core::credentials;
use crate::error::{AppError, AppResult, ErrorKind};
use crate::my::browse;
use crate::pg::browse::TableDetail;
use crate::pg::client::QueryResult;
use crate::pg::edit::CellEdit;

#[tauri::command]
pub async fn my_connect(state: tauri::State<'_, AppState>, id: String) -> AppResult<()> {
    let conns = crate::core::repository::ConnectionRepo::new(&state.config_dir).load()?;
    let conn = conns.into_iter().find(|c| c.id == id)
        .ok_or_else(|| AppError::new(ErrorKind::NotFound, "连接不存在"))?;
    let password = credentials::load_password(&state.backend, &conn)?;
    state.my_pool.connect(&id, &conn.host, conn.port, &conn.user, &password, &conn.database).await
}

#[tauri::command]
pub async fn my_list_objects(state: tauri::State<'_, AppState>, id: String) -> AppResult<Vec<String>> {
    browse::list_tables(&state.my_pool, &id).await
}

#[tauri::command]
pub async fn my_query(state: tauri::State<'_, AppState>, id: String, sql: String) -> AppResult<QueryResult> {
    state.my_pool.query(&id, &sql).await
}

#[tauri::command]
pub async fn my_table_detail(state: tauri::State<'_, AppState>, id: String, table: String) -> AppResult<TableDetail> {
    browse::table_detail(&state.my_pool, &id, &table).await
}

#[tauri::command]
pub async fn my_commit_edits(state: tauri::State<'_, AppState>, id: String, edits: Vec<CellEdit>) -> AppResult<u64> {
    state.my_pool.commit_edits(&id, &edits).await
}
