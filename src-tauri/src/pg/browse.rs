use crate::error::AppResult;
use crate::pg::client::PgPool;
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ColumnInfo { pub name: String, pub data_type: String, pub is_pk: bool }

#[derive(Debug, Serialize)]
pub struct TableDetail { pub columns: Vec<ColumnInfo> }

/// 列出 public schema 下的表名。
pub async fn list_tables(pool: &PgPool, id: &str) -> AppResult<Vec<String>> {
    let r = pool.query(id,
        "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename").await?;
    Ok(r.rows.into_iter().filter_map(|row| row.into_iter().next().flatten()).collect())
}

/// 表详情:列名、类型、是否主键。
pub async fn table_detail(pool: &PgPool, id: &str, table: &str) -> AppResult<TableDetail> {
    let cols = pool.query(id, &format!(
        "SELECT column_name, data_type FROM information_schema.columns \
         WHERE table_schema='public' AND table_name='{}' ORDER BY ordinal_position",
        escape_literal(table))).await?;
    let pks = pool.query(id, &format!(
        "SELECT a.attname FROM pg_index i \
         JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey) \
         WHERE i.indrelid='public.{}'::regclass AND i.indisprimary",
        escape_ident(table))).await?;
    let pk_set: std::collections::HashSet<String> =
        pks.rows.into_iter().filter_map(|r| r.into_iter().next().flatten()).collect();

    let columns = cols.rows.into_iter().map(|r| {
        let name = r.get(0).cloned().flatten().unwrap_or_default();
        let data_type = r.get(1).cloned().flatten().unwrap_or_default();
        let is_pk = pk_set.contains(&name);
        ColumnInfo { name, data_type, is_pk }
    }).collect();
    Ok(TableDetail { columns })
}

/// 转义标识符内的双引号(用于 ::regclass 文本)。
fn escape_ident(s: &str) -> String { s.replace('"', "\"\"") }
/// 转义字符串字面量中的单引号。
fn escape_literal(s: &str) -> String { s.replace('\'', "''") }

#[cfg(test)]
mod tests {
    use super::*;
    fn conninfo() -> String {
        std::env::var("DBSTUDIO_TEST_PG")
            .unwrap_or_else(|_| "host=127.0.0.1 port=5432 user=postgres password=postgres dbname=postgres".into())
    }
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    #[ignore]
    async fn lists_users_table_and_detail() {
        let pool = PgPool::default();
        pool.connect("t", &conninfo()).await.unwrap();
        let tables = list_tables(&pool, "t").await.unwrap();
        assert!(tables.contains(&"users".to_string()));
        let detail = table_detail(&pool, "t", "users").await.unwrap();
        let id_col = detail.columns.iter().find(|c| c.name == "id").unwrap();
        assert!(id_col.is_pk);
    }
}
