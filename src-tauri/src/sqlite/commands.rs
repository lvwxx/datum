use crate::commands::AppState;
use crate::error::{AppError, AppResult, ErrorKind};
use crate::sqlite::browse::{self, TableDetail};
use crate::sqlite::client::QueryResult;
use crate::sqlite::edit::{self, CellEdit};

/// 用连接 id 找到配置中的文件路径,打开 SQLite 数据库。
#[tauri::command]
pub async fn sqlite_connect(state: tauri::State<'_, AppState>, id: String) -> AppResult<()> {
    let conns = crate::core::repository::ConnectionRepo::new(&state.config_dir).load()?;
    let conn = conns
        .into_iter()
        .find(|c| c.id == id)
        .ok_or_else(|| AppError::new(ErrorKind::NotFound, "连接不存在"))?;
    let path = conn
        .file_path
        .filter(|p| !p.is_empty())
        .ok_or_else(|| AppError::new(ErrorKind::Connection, "未指定 SQLite 文件路径"))?;
    state.sqlite_pool.connect(&id, &path)
}

#[tauri::command]
pub async fn sqlite_list_objects(state: tauri::State<'_, AppState>, id: String) -> AppResult<Vec<String>> {
    browse::list_tables(&state.sqlite_pool, &id)
}

#[tauri::command]
pub async fn sqlite_query(state: tauri::State<'_, AppState>, id: String, sql: String) -> AppResult<QueryResult> {
    state.sqlite_pool.query(&id, &sql)
}

#[tauri::command]
pub async fn sqlite_table_detail(state: tauri::State<'_, AppState>, id: String, table: String) -> AppResult<TableDetail> {
    browse::table_detail(&state.sqlite_pool, &id, &table)
}

#[tauri::command]
pub async fn sqlite_commit_edits(state: tauri::State<'_, AppState>, id: String, edits: Vec<CellEdit>) -> AppResult<u64> {
    edit::commit_edits(&state.sqlite_pool, &id, &edits)
}
