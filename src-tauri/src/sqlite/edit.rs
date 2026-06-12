use crate::error::AppResult;
use crate::sqlite::client::SqlitePool;
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
pub fn commit_edits(pool: &SqlitePool, id: &str, edits: &[CellEdit]) -> AppResult<u64> {
    if edits.is_empty() {
        return Ok(0);
    }
    pool.with_txn(id, edits)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_edits_is_noop() {
        let p = SqlitePool::default();
        p.connect("t", ":memory:").unwrap();
        assert_eq!(commit_edits(&p, "t", &[]).unwrap(), 0);
    }

    #[test]
    fn edits_a_numeric_column() {
        let p = SqlitePool::default();
        p.connect("t", ":memory:").unwrap();
        p.query("t", "CREATE TABLE numtest(id INTEGER PRIMARY KEY, qty INTEGER)").unwrap();
        p.query("t", "INSERT INTO numtest VALUES (1, 10)").unwrap();
        let edits = vec![CellEdit {
            table: "numtest".into(), pk_col: "id".into(), pk_value: "1".into(),
            column: "qty".into(), new_value: "42".into(),
        }];
        assert_eq!(commit_edits(&p, "t", &edits).unwrap(), 1);
        let r = p.query("t", "SELECT qty FROM numtest WHERE id=1").unwrap();
        assert_eq!(r.rows[0][0].as_deref(), Some("42"));
    }
}
