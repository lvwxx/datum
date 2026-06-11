use crate::error::{AppError, AppResult, ErrorKind};
use crate::pg::client::QueryResult;
use mysql_async::prelude::Queryable;
use mysql_async::{Opts, OptsBuilder, Pool, Row, TxOpts, Value};
use std::collections::HashMap;
use tokio::sync::Mutex;

#[derive(Default)]
pub struct MyPool {
    pools: Mutex<HashMap<String, Pool>>,
}

fn connerr(e: impl std::fmt::Display) -> AppError {
    AppError::new(ErrorKind::Connection, "连接 MySQL 失败").with_detail(e.to_string())
}
fn qerr(e: impl std::fmt::Display) -> AppError {
    AppError::new(ErrorKind::Query, "查询失败").with_detail(e.to_string())
}
fn ederr(e: impl std::fmt::Display) -> AppError {
    AppError::new(ErrorKind::Edit, "更新失败").with_detail(e.to_string())
}

/// 反引号标识符转义。
pub fn esc_ident(s: &str) -> String {
    s.replace('`', "``")
}
/// 字符串字面量转义(MySQL 默认开启反斜杠转义)。
pub fn esc_str(s: &str) -> String {
    s.replace('\\', "\\\\").replace('\'', "''")
}

/// 把 MySQL 值转成展示字符串;None 表示 SQL NULL。
fn val_to_string(v: &Value) -> Option<String> {
    match v {
        Value::NULL => None,
        Value::Bytes(b) => Some(String::from_utf8_lossy(b).into_owned()),
        Value::Int(i) => Some(i.to_string()),
        Value::UInt(u) => Some(u.to_string()),
        Value::Float(f) => Some(f.to_string()),
        Value::Double(d) => Some(d.to_string()),
        Value::Date(y, mo, d, h, mi, s, us) => {
            let base = format!("{:04}-{:02}-{:02} {:02}:{:02}:{:02}", y, mo, d, h, mi, s);
            Some(if *us > 0 { format!("{base}.{us:06}") } else { base })
        }
        Value::Time(neg, d, h, mi, s, us) => {
            let sign = if *neg { "-" } else { "" };
            let base = format!("{sign}{:03}:{:02}:{:02}", (*d as u32) * 24 + *h as u32, mi, s);
            Some(if *us > 0 { format!("{base}.{us:06}") } else { base })
        }
    }
}

fn row_to_strings(row: &Row) -> Vec<Option<String>> {
    (0..row.len()).map(|i| row.as_ref(i).and_then(val_to_string)).collect()
}

impl MyPool {
    pub async fn connect(&self, id: &str, host: &str, port: u16, user: &str, pass: &str, db: &str) -> AppResult<()> {
        let mut b = OptsBuilder::default()
            .ip_or_hostname(host.to_string())
            .tcp_port(port)
            .user(Some(user.to_string()))
            .db_name(Some(db.to_string()));
        if !pass.is_empty() {
            b = b.pass(Some(pass.to_string()));
        }
        let pool = Pool::new(Opts::from(b));
        // 试连一次,确保配置可用
        let conn = pool.get_conn().await.map_err(connerr)?;
        drop(conn);
        self.pools.lock().await.insert(id.to_string(), pool);
        Ok(())
    }

    async fn pool(&self, id: &str) -> AppResult<Pool> {
        self.pools.lock().await.get(id).cloned()
            .ok_or_else(|| AppError::new(ErrorKind::Connection, "连接未建立,请先连接"))
    }

    /// 执行任意 SQL,值统一转为文本。
    pub async fn query(&self, id: &str, sql: &str) -> AppResult<QueryResult> {
        let pool = self.pool(id).await?;
        let mut conn = pool.get_conn().await.map_err(qerr)?;
        let mut result = conn.query_iter(sql).await.map_err(qerr)?;
        let columns: Vec<String> = result
            .columns()
            .map(|cs| cs.iter().map(|c| c.name_str().to_string()).collect())
            .unwrap_or_default();
        let raw: Vec<Row> = result.collect::<Row>().await.map_err(qerr)?;
        let affected = result.affected_rows();
        let rows: Vec<Vec<Option<String>>> = raw.iter().map(row_to_strings).collect();
        Ok(QueryResult { columns, rows, affected: Some(affected) })
    }

    /// 批量编辑:单事务内逐条 UPDATE,全成功提交、任一失败回滚。
    pub async fn commit_edits(&self, id: &str, edits: &[crate::pg::edit::CellEdit]) -> AppResult<u64> {
        if edits.is_empty() {
            return Ok(0);
        }
        let pool = self.pool(id).await?;
        let mut conn = pool.get_conn().await.map_err(ederr)?;
        let mut tx = conn.start_transaction(TxOpts::default()).await.map_err(ederr)?;
        let mut n = 0u64;
        for e in edits {
            let sql = format!(
                "UPDATE `{}` SET `{}` = '{}' WHERE `{}` = '{}'",
                esc_ident(&e.table), esc_ident(&e.column), esc_str(&e.new_value),
                esc_ident(&e.pk_col), esc_str(&e.pk_value),
            );
            tx.query_drop(&sql).await.map_err(ederr)?;
            n += tx.affected_rows();
        }
        tx.commit().await.map_err(ederr)?;
        Ok(n)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn cfg() -> (String, u16, String, String, String) {
        // DBSTUDIO_TEST_MYSQL=host:port:user:pass:db
        let raw = std::env::var("DBSTUDIO_TEST_MYSQL")
            .unwrap_or_else(|_| "127.0.0.1:3306:root::dbstudio_test".into());
        let p: Vec<&str> = raw.split(':').collect();
        (p[0].into(), p[1].parse().unwrap_or(3306), p[2].into(), p.get(3).cloned().unwrap_or("").into(), p.get(4).cloned().unwrap_or("dbstudio_test").into())
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    #[ignore]
    async fn connect_query_edit() {
        let (h, port, u, pw, db) = cfg();
        let pool = MyPool::default();
        pool.connect("t", &h, port, &u, &pw, &db).await.unwrap();
        pool.query("t", "DROP TABLE IF EXISTS my_test").await.unwrap();
        pool.query("t", "CREATE TABLE my_test(id BIGINT PRIMARY KEY, name VARCHAR(50), qty INT)").await.unwrap();
        pool.query("t", "INSERT INTO my_test VALUES (1,'Alice',10),(2,'Bob',20)").await.unwrap();

        let r = pool.query("t", "SELECT id, name FROM my_test ORDER BY id").await.unwrap();
        assert_eq!(r.columns, vec!["id", "name"]);
        assert_eq!(r.rows[0], vec![Some("1".into()), Some("Alice".into())]);

        let edits = vec![crate::pg::edit::CellEdit {
            table: "my_test".into(), pk_col: "id".into(), pk_value: "2".into(),
            column: "name".into(), new_value: "Bobby".into(),
        }];
        assert_eq!(pool.commit_edits("t", &edits).await.unwrap(), 1);
        let r2 = pool.query("t", "SELECT name FROM my_test WHERE id=2").await.unwrap();
        assert_eq!(r2.rows[0][0].as_deref(), Some("Bobby"));

        pool.query("t", "DROP TABLE my_test").await.unwrap();
    }
}
