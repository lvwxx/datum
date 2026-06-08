use crate::error::{AppError, AppResult, ErrorKind};
use redis::aio::MultiplexedConnection;
use redis::FromRedisValue;
use serde::Serialize;
use std::collections::HashMap;
use tokio::sync::Mutex;

/// key 的值,统一成 列 + 行 的表格形态,前端按类型渲染。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyValue {
    pub key: String,
    pub key_type: String, // string/hash/list/set/zset/none
    pub columns: Vec<String>,
    pub rows: Vec<Vec<String>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyDetail {
    pub key: String,
    pub key_type: String,
    pub ttl: i64,  // -1 永不过期,-2 不存在
    pub size: i64, // 字符串长度 / 元素个数
}

#[derive(Default)]
pub struct RedisPool {
    conns: Mutex<HashMap<String, MultiplexedConnection>>,
}

fn qerr(e: redis::RedisError) -> AppError {
    AppError::new(ErrorKind::Query, "Redis 命令失败").with_detail(e.to_string())
}

/// 把任意 Redis 回复转成可读字符串(版本无关,基于 FromRedisValue)。
fn format_reply(v: &redis::Value) -> String {
    if let Ok(s) = String::from_redis_value(v) {
        return s;
    }
    if let Ok(list) = Vec::<String>::from_redis_value(v) {
        return list.join("\n");
    }
    format!("{:?}", v)
}

impl RedisPool {
    pub async fn connect(&self, id: &str, url: &str) -> AppResult<()> {
        let client = redis::Client::open(url)
            .map_err(|e| AppError::new(ErrorKind::Connection, "无效的 Redis 连接串").with_detail(e.to_string()))?;
        let con = client.get_multiplexed_async_connection().await
            .map_err(|e| AppError::new(ErrorKind::Connection, "连接 Redis 失败").with_detail(e.to_string()))?;
        self.conns.lock().await.insert(id.to_string(), con);
        Ok(())
    }

    /// MultiplexedConnection 可廉价 clone,克隆出来避免在 await 期间持锁。
    async fn con(&self, id: &str) -> AppResult<MultiplexedConnection> {
        self.conns.lock().await.get(id).cloned()
            .ok_or_else(|| AppError::new(ErrorKind::Connection, "连接未建立,请先连接"))
    }

    /// SCAN 遍历匹配的 key,最多返回 2000 个(避免超大库卡死)。
    pub async fn scan(&self, id: &str, pattern: &str) -> AppResult<Vec<String>> {
        let mut con = self.con(id).await?;
        let mut cursor: u64 = 0;
        let mut keys: Vec<String> = vec![];
        loop {
            let (next, batch): (u64, Vec<String>) = redis::cmd("SCAN")
                .arg(cursor).arg("MATCH").arg(pattern).arg("COUNT").arg(500)
                .query_async(&mut con).await.map_err(qerr)?;
            keys.extend(batch);
            cursor = next;
            if cursor == 0 || keys.len() >= 2000 { break; }
        }
        keys.sort();
        Ok(keys)
    }

    pub async fn get_value(&self, id: &str, key: &str) -> AppResult<KeyValue> {
        let mut con = self.con(id).await?;
        let t: String = redis::cmd("TYPE").arg(key).query_async(&mut con).await.map_err(qerr)?;
        let (columns, rows): (Vec<String>, Vec<Vec<String>>) = match t.as_str() {
            "string" => {
                let v: Option<String> = redis::cmd("GET").arg(key).query_async(&mut con).await.map_err(qerr)?;
                (vec!["value".into()], vec![vec![v.unwrap_or_default()]])
            }
            "hash" => {
                let m: Vec<(String, String)> = redis::cmd("HGETALL").arg(key).query_async(&mut con).await.map_err(qerr)?;
                (vec!["field".into(), "value".into()], m.into_iter().map(|(f, v)| vec![f, v]).collect())
            }
            "list" => {
                let l: Vec<String> = redis::cmd("LRANGE").arg(key).arg(0).arg(-1).query_async(&mut con).await.map_err(qerr)?;
                (vec!["index".into(), "value".into()], l.into_iter().enumerate().map(|(i, v)| vec![i.to_string(), v]).collect())
            }
            "set" => {
                let s: Vec<String> = redis::cmd("SMEMBERS").arg(key).query_async(&mut con).await.map_err(qerr)?;
                (vec!["member".into()], s.into_iter().map(|m| vec![m]).collect())
            }
            "zset" => {
                let z: Vec<(String, String)> = redis::cmd("ZRANGE").arg(key).arg(0).arg(-1).arg("WITHSCORES").query_async(&mut con).await.map_err(qerr)?;
                (vec!["member".into(), "score".into()], z.into_iter().map(|(m, sc)| vec![m, sc]).collect())
            }
            _ => (vec![], vec![]),
        };
        Ok(KeyValue { key: key.into(), key_type: t, columns, rows })
    }

    pub async fn key_detail(&self, id: &str, key: &str) -> AppResult<KeyDetail> {
        let mut con = self.con(id).await?;
        let t: String = redis::cmd("TYPE").arg(key).query_async(&mut con).await.map_err(qerr)?;
        let ttl: i64 = redis::cmd("TTL").arg(key).query_async(&mut con).await.map_err(qerr)?;
        let size: i64 = match t.as_str() {
            "string" => redis::cmd("STRLEN").arg(key).query_async(&mut con).await.unwrap_or(0),
            "hash" => redis::cmd("HLEN").arg(key).query_async(&mut con).await.unwrap_or(0),
            "list" => redis::cmd("LLEN").arg(key).query_async(&mut con).await.unwrap_or(0),
            "set" => redis::cmd("SCARD").arg(key).query_async(&mut con).await.unwrap_or(0),
            "zset" => redis::cmd("ZCARD").arg(key).query_async(&mut con).await.unwrap_or(0),
            _ => 0,
        };
        Ok(KeyDetail { key: key.into(), key_type: t, ttl, size })
    }

    /// 执行任意命令(按空白拆分),返回可读文本。
    pub async fn exec(&self, id: &str, command: &str) -> AppResult<String> {
        let mut con = self.con(id).await?;
        let parts: Vec<&str> = command.split_whitespace().collect();
        if parts.is_empty() {
            return Ok(String::new());
        }
        let mut cmd = redis::cmd(parts[0]);
        for a in &parts[1..] {
            cmd.arg(*a);
        }
        let val: redis::Value = cmd.query_async(&mut con).await.map_err(qerr)?;
        Ok(format_reply(&val))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn url() -> String {
        std::env::var("DBSTUDIO_TEST_REDIS").unwrap_or_else(|_| "redis://127.0.0.1:6379/0".into())
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    #[ignore]
    async fn scan_get_and_exec() {
        let pool = RedisPool::default();
        pool.connect("t", &url()).await.unwrap();
        // 自种数据(前缀避免与真实数据冲突)
        pool.exec("t", "SET dbstudio:greeting hello").await.unwrap();
        pool.exec("t", "HSET dbstudio:user name Alice age 30").await.unwrap();

        let keys = pool.scan("t", "dbstudio:*").await.unwrap();
        assert!(keys.contains(&"dbstudio:greeting".to_string()));

        let v = pool.get_value("t", "dbstudio:greeting").await.unwrap();
        assert_eq!(v.key_type, "string");
        assert_eq!(v.rows[0][0], "hello");

        let h = pool.get_value("t", "dbstudio:user").await.unwrap();
        assert_eq!(h.key_type, "hash");
        assert!(h.rows.iter().any(|r| r[0] == "name" && r[1] == "Alice"));

        let d = pool.key_detail("t", "dbstudio:user").await.unwrap();
        assert_eq!(d.key_type, "hash");
        assert_eq!(d.size, 2);

        let pong = pool.exec("t", "PING").await.unwrap();
        assert_eq!(pong, "PONG");

        // 清理
        pool.exec("t", "DEL dbstudio:greeting dbstudio:user").await.unwrap();
    }
}
