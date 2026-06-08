use serde::Serialize;

#[derive(Debug, Serialize, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub kind: ErrorKind,
    pub message: String,
    pub detail: Option<String>,
}

#[derive(Debug, Serialize, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum ErrorKind {
    Connection,
    Query,
    Edit,
    Credential,
    Config,
    NotFound,
}

impl AppError {
    pub fn new(kind: ErrorKind, message: impl Into<String>) -> Self {
        Self { kind, message: message.into(), detail: None }
    }
    pub fn with_detail(mut self, detail: impl Into<String>) -> Self {
        self.detail = Some(detail.into());
        self
    }
}

pub type AppResult<T> = Result<T, AppError>;

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn serializes_to_camel_case_json() {
        let e = AppError::new(ErrorKind::Query, "boom").with_detail("syntax error");
        let v = serde_json::to_value(&e).unwrap();
        assert_eq!(v["kind"], "query");
        assert_eq!(v["message"], "boom");
        assert_eq!(v["detail"], "syntax error");
    }
}
