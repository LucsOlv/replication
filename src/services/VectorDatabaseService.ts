import { Database } from 'bun:sqlite';
import { dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Result, ok, err } from '../utils/result';
import type { FileChunk, IndexMetadata } from '../types/vectorIndex';
import { ReplicationPaths } from '../utils/paths';
import { IncrementalLogService } from './IncrementalLogService';

export class VectorDatabaseService {
  private static db: Database | null = null;
  private static currentDbPath: string | null = null;

  /**
   * Retorna o caminho do banco de dados dinamicamente
   * @private
   */
  private static getDbPath(): string {
    return ReplicationPaths.getVectorDb();
  }

  static init(overrideDbPath?: string): Result<void> {
    try {
      const dbPath = overrideDbPath || this.getDbPath();

      // Se já está aberto no mesmo caminho, não re-inicializa
      if (this.db && this.currentDbPath === dbPath) {
        return ok(undefined);
      }

      // Se está aberto em outro caminho, fecha antes
      if (this.db && this.currentDbPath !== dbPath) {
        this.close();
      }

      // Garante que o diretório existe
      const dbDir = dirname(dbPath);
      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true });
      }

      this.db = new Database(dbPath);
      this.currentDbPath = dbPath;
      this.createTables();

      IncrementalLogService.system('Vector database initialized', 'VectorDatabaseService', {
        dbPath,
      });

      return ok(undefined);
    } catch (error) {
      IncrementalLogService.error(error as Error, 'VectorDatabaseService.init', {
        dbPath: overrideDbPath || this.getDbPath(),
      });
      return err(error as Error);
    }
  }

  private static createTables(): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS file_chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        chunk_text TEXT NOT NULL,
        embedding BLOB NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE(file_path, chunk_index)
      );

      CREATE INDEX IF NOT EXISTS idx_file_path ON file_chunks(file_path);

      CREATE TABLE IF NOT EXISTS index_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  static saveChunk(params: {
    filePath: string;
    chunkIndex: number;
    chunkText: string;
    embedding: Float32Array;
  }): Result<void> {
    try {
      if (!this.db) {
        const error = new Error('Database not initialized');
        IncrementalLogService.error(error, 'VectorDatabaseService.saveChunk');
        return err(error);
      }

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO file_chunks 
        (file_path, chunk_index, chunk_text, embedding, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      // Serializa Float32Array para Buffer
      const embeddingBuffer = Buffer.from(params.embedding.buffer);

      stmt.run(
        params.filePath,
        params.chunkIndex,
        params.chunkText,
        embeddingBuffer,
        Date.now()
      );

      return ok(undefined);
    } catch (error) {
      IncrementalLogService.error(error as Error, 'VectorDatabaseService.saveChunk', {
        filePath: params.filePath,
        chunkIndex: params.chunkIndex,
      });
      return err(error as Error);
    }
  }

  static getAllChunks(): Result<FileChunk[]> {
    try {
      if (!this.db) {
        const error = new Error('Database not initialized');
        IncrementalLogService.error(error, 'VectorDatabaseService.getAllChunks');
        return err(error);
      }

      const rows = this.db
        .prepare(`
          SELECT id, file_path, chunk_index, chunk_text, embedding, created_at
          FROM file_chunks
        `)
        .all() as Array<{
          id: number;
          file_path: string;
          chunk_index: number;
          chunk_text: string;
          embedding: Buffer;
          created_at: number;
        }>;

      // Deserializa embeddings
      const chunks: FileChunk[] = rows.map((row) => ({
        id: row.id,
        filePath: row.file_path,
        chunkIndex: row.chunk_index,
        chunkText: row.chunk_text,
        embedding: new Float32Array(
          row.embedding.buffer,
          row.embedding.byteOffset,
          row.embedding.length / Float32Array.BYTES_PER_ELEMENT
        ),
        createdAt: row.created_at,
      }));

      return ok(chunks);
    } catch (error) {
      IncrementalLogService.error(error as Error, 'VectorDatabaseService.getAllChunks');
      return err(error as Error);
    }
  }

  static saveMetadata(metadata: Partial<IndexMetadata>): Result<void> {
    try {
      if (!this.db) {
        const error = new Error('Database not initialized');
        IncrementalLogService.error(error, 'VectorDatabaseService.saveMetadata');
        return err(error);
      }

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO index_metadata (key, value)
        VALUES (?, ?)
      `);

      for (const [key, value] of Object.entries(metadata)) {
        stmt.run(key, String(value));
      }

      return ok(undefined);
    } catch (error) {
      IncrementalLogService.error(error as Error, 'VectorDatabaseService.saveMetadata', {
        metadata,
      });
      return err(error as Error);
    }
  }

  static getMetadata(): Result<IndexMetadata | null> {
    try {
      if (!this.db) {
        const error = new Error('Database not initialized');
        IncrementalLogService.error(error, 'VectorDatabaseService.getMetadata');
        return err(error);
      }

      const rows = this.db
        .prepare('SELECT key, value FROM index_metadata')
        .all() as Array<{ key: string; value: string }>;

      if (rows.length === 0) {
        return ok(null);
      }

      const metadata: any = {};
      for (const row of rows) {
        metadata[row.key] = row.value;
      }

      // Converte strings de volta para números onde necessário
      return ok({
        last_indexed_at: Number(metadata.last_indexed_at || 0),
        total_files: Number(metadata.total_files || 0),
        total_chunks: Number(metadata.total_chunks || 0),
        embedding_model: metadata.embedding_model || '',
        chunk_size: Number(metadata.chunk_size || 512),
        chunk_overlap: Number(metadata.chunk_overlap || 50),
      });
    } catch (error) {
      IncrementalLogService.error(error as Error, 'VectorDatabaseService.getMetadata');
      return err(error as Error);
    }
  }

  static clearIndex(): Result<void> {
    try {
      if (!this.db) {
        const error = new Error('Database not initialized');
        IncrementalLogService.error(error, 'VectorDatabaseService.clearIndex');
        return err(error);
      }

      this.db.prepare('DELETE FROM file_chunks').run();
      this.db.prepare('DELETE FROM index_metadata').run();

      IncrementalLogService.system('Vector index cleared', 'VectorDatabaseService');

      return ok(undefined);
    } catch (error) {
      IncrementalLogService.error(error as Error, 'VectorDatabaseService.clearIndex');
      return err(error as Error);
    }
  }

  static getTotalChunks(): Result<number> {
    try {
      if (!this.db) {
        const error = new Error('Database not initialized');
        IncrementalLogService.error(error, 'VectorDatabaseService.getTotalChunks');
        return err(error);
      }

      const result = this.db
        .prepare('SELECT COUNT(*) as count FROM file_chunks')
        .get() as { count: number };

      return ok(result.count);
    } catch (error) {
      IncrementalLogService.error(error as Error, 'VectorDatabaseService.getTotalChunks');
      return err(error as Error);
    }
  }

  static close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.currentDbPath = null;
    }
  }
}
