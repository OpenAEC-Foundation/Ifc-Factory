/// Errors that can occur during IFCX operations.
#[derive(Debug, thiserror::Error)]
pub enum IfcxError {
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Invalid IFCXB file: {0}")]
    InvalidBinary(String),

    #[error("Not implemented: {0}")]
    NotImplemented(String),
}
