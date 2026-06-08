use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum DbKind { Pg, Redis }

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum Env { Local, Staging, Prod }

impl Env {
    /// 仅 Local 把密码明文存本地;其余走钥匙串。
    pub fn stores_password_in_plaintext(&self) -> bool {
        matches!(self, Env::Local)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Connection {
    pub id: String,
    pub name: String,
    pub kind: DbKind,
    pub env: Env,
    pub host: String,
    pub port: u16,
    pub user: String,
    pub database: String,
    /// 仅当 env == Local 时这里才有明文密码;否则为 None(密码在钥匙串)。
    #[serde(default)]
    pub plaintext_password: Option<String>,
}

impl Connection {
    pub fn env_label(&self) -> &'static str {
        match self.env { Env::Local => "local", Env::Staging => "staging", Env::Prod => "prod" }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn local_stores_plaintext_other_envs_do_not() {
        assert!(Env::Local.stores_password_in_plaintext());
        assert!(!Env::Staging.stores_password_in_plaintext());
        assert!(!Env::Prod.stores_password_in_plaintext());
    }
    #[test]
    fn roundtrips_json() {
        let c = Connection {
            id: "c1".into(), name: "prod-pg".into(), kind: DbKind::Pg, env: Env::Prod,
            host: "db.example.com".into(), port: 5432, user: "app".into(),
            database: "appdb".into(), plaintext_password: None,
        };
        let json = serde_json::to_string(&c).unwrap();
        let back: Connection = serde_json::from_str(&json).unwrap();
        assert_eq!(c, back);
    }
}
