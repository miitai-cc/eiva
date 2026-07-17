use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Invalid input: {0}")]
    InvalidInput(String),
    #[error("Database error: {0}")]
    DatabaseError(String),
    #[error("Qdrant error: {0}")]
    QdrantError(String),
    #[error("LLM error: {0}")]
    LlmError(String),
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),
    #[error("Authentication error: {0}")]
    AuthError(String),
    #[error("Internal error: {0}")]
    Internal(String),
}
