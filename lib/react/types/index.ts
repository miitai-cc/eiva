export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
}

export interface Document {
  id: string;
  filename: string;
  content_type: string;
  file_size: number;
  metadata?: Record<string, unknown>;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
}

export type DocumentStatus = 'pending' | 'processing' | 'indexed' | 'failed';

export interface DocumentChunk {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  metadata?: Record<string, unknown>;
}

export interface ChunkWithScore extends DocumentChunk {
  score: number;
}

export interface RagQuery {
  query: string;
  top_k?: number;
  use_hybrid?: boolean;
}

export interface RagResult {
  query: string;
  chunks: ChunkWithScore[];
  answer?: string;
  sources: string[];
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  database: boolean;
  qdrant: boolean;
  timestamp: string;
}

export type Language = 'zh-TW' | 'en';

export interface ApiResponse<T = unknown> {
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ModelConfig {
  model_type: 'embedding' | 'reranking' | 'llm';
  model_path: string;
  device: string;
}

export type FileType = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'md' | 'txt' | 'html';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}
