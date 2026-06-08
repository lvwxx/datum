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

    /// 在一个事务里批量执行编辑(全成功或全回滚)。返回受影响行数。
    pub async fn with_txn(&self, id: &str, edits: &[crate::pg::edit::CellEdit]) -> AppResult<u64> {
        let mut guard = self.clients.lock().await;
        let client = guard.get_mut(id)
            .ok_or_else(|| AppError::new(ErrorKind::Connection, "连接未建立,请先连接"))?;
        let txn = client.transaction().await
            .map_err(|e| AppError::new(ErrorKind::Edit, "开启事务失败").with_detail(e.to_string()))?;
        let mut n = 0u64;
        for e in edits {
            // 将 new_value 和 pk_value 都内联为单引号转义的字符串字面量（无绑定参数）。
            // PostgreSQL 会将字符串字面量隐式强制转换为目标列的标量类型（如 int4、bool、timestamp 等），
            // 因此这可以正确处理任意标量列。单引号转义防止 SQL 注入，标识符使用双引号转义。
            let sql = format!(
                "UPDATE \"{}\" SET \"{}\" = '{}' WHERE \"{}\" = '{}'",
                e.table.replace('"', "\"\""),
                e.column.replace('"', "\"\""),
                e.new_value.replace('\'', "''"),
                e.pk_col.replace('"', "\"\""),
                e.pk_value.replace('\'', "''"));
            let affected = txn.execute(&sql, &[]).await
                .map_err(|err| AppError::new(ErrorKind::Edit, "更新失败").with_detail(err.to_string()))?;
            n += affected;
        }
        txn.commit().await
            .map_err(|e| AppError::new(ErrorKind::Edit, "提交事务失败").with_detail(e.to_string()))?;
        Ok(n)
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

#[cfg(test)]
mod tests {
    use super::*;
    fn conninfo() -> String {
        std::env::var("DBSTUDIO_TEST_PG")
            .unwrap_or_else(|_| "host=127.0.0.1 port=5432 user=postgres password=postgres dbname=postgres".into())
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    #[ignore]
    async fn connects_and_queries_users() {
        let pool = PgPool::default();
        pool.connect("t", &conninfo()).await.unwrap();
        assert!(pool.is_connected("t").await);
        let r = pool.query("t", "SELECT id, name FROM users ORDER BY id").await.unwrap();
        assert_eq!(r.columns, vec!["id", "name"]);
        assert_eq!(r.rows[0], vec![Some("1".into()), Some("Alice".into())]);
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    #[ignore]
    async fn query_error_surfaces_as_app_error() {
        let pool = PgPool::default();
        pool.connect("t", &conninfo()).await.unwrap();
        let err = pool.query("t", "SELECT * FROM no_such_table").await.unwrap_err();
        assert_eq!(err.kind, ErrorKind::Query);
    }
}
