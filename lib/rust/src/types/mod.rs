use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentId(pub Uuid);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChunkId(pub Uuid);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserId(pub Uuid);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: DocumentId,
    pub filename: String,
    pub content_type: String,
    pub file_size: i64,
    pub metadata: Option<serde_json::Value>,
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentChunk {
    pub id: ChunkId,
    pub document_id: DocumentId,
    pub content: String,
    pub embedding: Option<Vec<f32>>,
    pub metadata: Option<serde_json::Value>,
    pub index: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChunkWithScore {
    pub chunk: DocumentChunk,
    pub score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RagQuery {
    pub query: String,
    pub top_k: u32,
    pub threshold: f64,
    pub use_hybrid: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RagResult {
    pub query: String,
    pub chunks: Vec<ChunkWithScore>,
    pub answer: Option<String>,
    pub sources: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Language {
    ZhTw,
    En,
    Ja,
    Ko,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    pub model_type: ModelType,
    pub model_path: String,
    pub device: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ModelType {
    Embedding,
    Reranking,
    LLM,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DocumentStatus {
    Pending,
    Processing,
    Indexed,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FileType {
    Pdf,
    Word,
    Excel,
    PowerPoint,
    Markdown,
    Txt,
    Html,
}
