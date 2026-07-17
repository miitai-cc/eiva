export const DEFAULT_EMBEDDING_DIMENSION = 512;
export const DEFAULT_CHUNK_SIZE = 512;
export const DEFAULT_CHUNK_OVERLAP = 128;
export const DEFAULT_TOP_K = 5;
export const DEFAULT_SCORE_THRESHOLD = 0.7;
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export const SUPPORTED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/markdown',
] as const;

export const SUPPORTED_FILE_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.txt', '.md'] as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    PROFILE: '/api/auth/profile',
  },
  DOCUMENTS: {
    LIST: '/api/documents',
    UPLOAD: '/api/documents/upload',
    DETAIL: (id: string) => `/api/documents/${id}`,
  },
  RAG: {
    QUERY: '/api/rag/query',
  },
  HEALTH: '/api/health',
  ADMIN: {
    USERS: '/api/admin/users',
  },
} as const;

export const EMBEDDING_MODELS = [
  { id: 'BAAI/bge-small-zh-v1.5', name: 'BGE Small ZH', dimension: 512, size: '33MB', lang: '繁體中文 + English' },
  { id: 'intfloat/multilingual-e5-small', name: 'Multilingual E5 Small', dimension: 384, size: '118MB', lang: '多語言含繁中' },
  { id: 'sentence-transformers/all-MiniLM-L6-v2', name: 'All MiniLM L6 v2', dimension: 384, size: '80MB', lang: 'English' },
] as const;

export const RERANKING_MODELS = [
  { id: 'BAAI/bge-reranker-v2-m3', name: 'BGE Reranker v2 M3', size: '570MB', lang: '多語言含繁中 + 英文' },
  { id: 'maidalun1020/bce-reranker-base_v1', name: 'BCE Reranker Base', size: '450MB', lang: '中文 + 英文' },
] as const;
