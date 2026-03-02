export interface Chunk {
  text: string;
  index: number;
}

export interface FileChunk {
  id: number;
  filePath: string;
  chunkIndex: number;
  chunkText: string;
  embedding: Float32Array;
  createdAt: number;
}

export interface IndexProgress {
  currentFile: string;
  processedFiles: number;
  totalFiles: number;
  processedChunks: number;
  totalChunks?: number;
  errors: number;
}

export interface IndexSummary {
  totalFiles: number;
  processedFiles: number;
  totalChunks: number;
  errors: Array<{ file: string; error: string }>;
  duration: number;
}

export interface SearchResult {
  filePath: string;
  chunkText: string;
  chunkIndex: number;
  similarity: number;
}

export interface IndexMetadata {
  last_indexed_at: number;
  total_files: number;
  total_chunks: number;
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
}

export interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface IndexingConfig {
  concurrency: number;        // Número de embeddings simultâneos (1-10)
  batchSize: number;           // Chunks por batch de embedding (1-50)
  chunkSize: number;           // Tamanho do chunk em caracteres
  chunkOverlap: number;        // Overlap entre chunks
}

export const DEFAULT_INDEXING_CONFIG: IndexingConfig = {
  concurrency: 3,
  batchSize: 10,
  chunkSize: 512,
  chunkOverlap: 50,
};

export const PERFORMANCE_PRESETS = {
  slow: { concurrency: 1, batchSize: 1, chunkSize: 512, chunkOverlap: 50 },
  balanced: { concurrency: 3, batchSize: 10, chunkSize: 512, chunkOverlap: 50 },
  fast: { concurrency: 5, batchSize: 20, chunkSize: 512, chunkOverlap: 50 },
  turbo: { concurrency: 10, batchSize: 50, chunkSize: 512, chunkOverlap: 50 },
};
