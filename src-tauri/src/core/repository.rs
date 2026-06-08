use crate::core::connection::Connection;
use crate::error::{AppError, AppResult, ErrorKind};
use std::path::{Path, PathBuf};

/// 负责把连接列表读写到 connections.json(一个目录下的固定文件名)。
pub struct ConnectionRepo { path: PathBuf }

impl ConnectionRepo {
    pub fn new(config_dir: &Path) -> Self {
        Self { path: config_dir.join("connections.json") }
    }

    pub fn load(&self) -> AppResult<Vec<Connection>> {
        if !self.path.exists() { return Ok(vec![]); }
        let bytes = std::fs::read(&self.path)
            .map_err(|e| AppError::new(ErrorKind::Config, "读取配置失败").with_detail(e.to_string()))?;
        serde_json::from_slice(&bytes)
            .map_err(|e| AppError::new(ErrorKind::Config, "解析配置失败").with_detail(e.to_string()))
    }

    pub fn save(&self, conns: &[Connection]) -> AppResult<()> {
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| AppError::new(ErrorKind::Config, "创建配置目录失败").with_detail(e.to_string()))?;
        }
        let json = serde_json::to_vec_pretty(conns)
            .map_err(|e| AppError::new(ErrorKind::Config, "序列化配置失败").with_detail(e.to_string()))?;
        std::fs::write(&self.path, json)
            .map_err(|e| AppError::new(ErrorKind::Config, "写入配置失败").with_detail(e.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::connection::{DbKind, Env};

    fn sample() -> Connection {
        Connection { id: "c1".into(), name: "local-pg".into(), kind: DbKind::Pg, env: Env::Local,
            host: "127.0.0.1".into(), port: 5432, user: "postgres".into(),
            database: "postgres".into(), plaintext_password: Some("pw".into()) }
    }

    #[test]
    fn load_missing_file_returns_empty() {
        let dir = std::env::temp_dir().join(format!("dbstudio-test-{}", std::process::id()));
        let repo = ConnectionRepo::new(&dir);
        assert_eq!(repo.load().unwrap().len(), 0);
    }

    #[test]
    fn save_then_load_roundtrips() {
        let dir = std::env::temp_dir().join(format!("dbstudio-rt-{}", std::process::id()));
        let repo = ConnectionRepo::new(&dir);
        repo.save(&[sample()]).unwrap();
        let loaded = repo.load().unwrap();
        assert_eq!(loaded.len(), 1);
        assert_eq!(loaded[0].name, "local-pg");
        std::fs::remove_dir_all(&dir).ok();
    }
}
