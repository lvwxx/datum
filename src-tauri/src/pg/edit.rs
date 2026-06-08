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
    fn test_config() -> tokio_postgres::Config {
        std::env::var("DBSTUDIO_TEST_PG")
            .unwrap_or_else(|_| "host=127.0.0.1 port=5432 user=postgres password=postgres dbname=postgres".into())
            .parse().unwrap()
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    #[ignore]
    async fn commits_a_cell_edit() {
        let pool = PgPool::default();
        pool.connect("t", &test_config()).await.unwrap();
        let edits = vec![CellEdit {
            table: "users".into(), pk_col: "id".into(), pk_value: "2".into(),
            column: "name".into(), new_value: "Bobby".into(),
        }];
        let n = commit_edits(&pool, "t", &edits).await.unwrap();
        assert_eq!(n, 1);
        let r = pool.query("t", "SELECT name FROM users WHERE id=2").await.unwrap();
        assert_eq!(r.rows[0][0].as_deref(), Some("Bobby"));
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    #[ignore]
    async fn bad_edit_rolls_back() {
        let pool = PgPool::default();
        pool.connect("t", &test_config()).await.unwrap();
        // 先确保 id=1 的 email 是已知值
        pool.query("t", "UPDATE users SET email='a@x.com' WHERE id=1").await.unwrap();
        // id 是 int8,写入非数字会失败 → 整批回滚
        let edits = vec![
            CellEdit { table: "users".into(), pk_col: "id".into(), pk_value: "1".into(),
                       column: "email".into(), new_value: "changed@x.com".into() },
            CellEdit { table: "users".into(), pk_col: "id".into(), pk_value: "1".into(),
                       column: "id".into(), new_value: "not-a-number".into() },
        ];
        assert!(commit_edits(&pool, "t", &edits).await.is_err());
        let r = pool.query("t", "SELECT email FROM users WHERE id=1").await.unwrap();
        assert_eq!(r.rows[0][0].as_deref(), Some("a@x.com")); // 第一条也被回滚
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    #[ignore]
    async fn edits_a_numeric_column() {
        let pool = PgPool::default();
        pool.connect("t", &test_config()).await.unwrap();
        pool.query("t", "DROP TABLE IF EXISTS dbstudio_numtest").await.unwrap();
        pool.query("t", "CREATE TABLE dbstudio_numtest(id int8 PRIMARY KEY, qty int4)").await.unwrap();
        pool.query("t", "INSERT INTO dbstudio_numtest VALUES (1, 10)").await.unwrap();
        let edits = vec![CellEdit {
            table: "dbstudio_numtest".into(), pk_col: "id".into(), pk_value: "1".into(),
            column: "qty".into(), new_value: "42".into(),
        }];
        let n = commit_edits(&pool, "t", &edits).await.unwrap();
        assert_eq!(n, 1);
        let r = pool.query("t", "SELECT qty FROM dbstudio_numtest WHERE id=1").await.unwrap();
        assert_eq!(r.rows[0][0].as_deref(), Some("42"));
        pool.query("t", "DROP TABLE dbstudio_numtest").await.unwrap();
    }
}
