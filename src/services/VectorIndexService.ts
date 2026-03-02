import PQueue from 'p-queue';
import { readdir, stat } from 'fs/promises';
import { join, extname, relative, resolve, isAbsolute } from 'path';
import cosineSimilarity from 'cosine-similarity';
import { Result, ok, err } from '../utils/result';
import { ChunkService } from './ChunkService';
import { EmbeddingService } from './EmbeddingService';
import { VectorDatabaseService } from './VectorDatabaseService';
import { IncrementalLogService } from './IncrementalLogService';
import { ReplicationPaths } from '../utils/paths';
import type { IndexProgress, IndexSummary, SearchResult, IndexingConfig } from '../types/vectorIndex';
import { DEFAULT_INDEXING_CONFIG } from '../types/vectorIndex';

export class VectorIndexService {
  // Fila dinâmica que será configurada por indexDirectory
  private static queue: PQueue | null = null;

  // Extensões de arquivos permitidos
  private static readonly ALLOWED_EXTENSIONS = new Set([
    // Código
    '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.hpp',
    '.cs', '.php', '.rb', '.swift', '.kt', '.scala', '.r', '.m', '.sh', '.bash',
    // Documentação
    '.md', '.txt', '.json', '.yaml', '.yml', '.xml', '.toml',
  ]);

  // Diretórios a ignorar
  private static readonly IGNORED_DIRS = new Set([
    'node_modules',
    '.git',
    'dist',
    'build',
    'out',
    'target',
    '.next',
    '.nuxt',
    'vendor',
    '__pycache__',
    '.venv',
    'venv',
  ]);

  /**
   * Resolve um caminho de diretório relativo contra o ProjectRoot do usuário
   * (não contra process.cwd() que é o diretório do TUI)
   */
  private static resolveDirPath(dirPath: string): string {
    if (isAbsolute(dirPath)) {
      return dirPath;
    }
    return resolve(ReplicationPaths.getProjectRoot(), dirPath);
  }

  /**
   * Resolve o caminho do banco vetorial a partir de um diretório
   */
  private static resolveDbPath(dirPath: string): string {
    const absDir = this.resolveDirPath(dirPath);
    return join(absDir, '.replication', 'data', 'vector-index.db');
  }

  /**
   * Indexa todos os arquivos de um diretório
   */
  static async indexDirectory(
    dirPath: string,
    onProgress?: (progress: IndexProgress) => void,
    config: IndexingConfig = DEFAULT_INDEXING_CONFIG
  ): Promise<Result<IndexSummary>> {
    // Resolve caminho relativo contra o ProjectRoot do usuário
    const resolvedDir = this.resolveDirPath(dirPath);
    const startTime = Date.now();

    IncrementalLogService.system('Starting directory indexing', 'VectorIndexService', {
      dirPath,
      resolvedDir,
      config,
    });

    try {
      // 1. Inicializa a fila com concorrência configurável
      this.queue = new PQueue({ concurrency: config.concurrency });

      // 2. Inicializa o banco de dados usando o caminho do diretório
      const dbPath = this.resolveDbPath(resolvedDir);
      const initResult = VectorDatabaseService.init(dbPath);
      if (!initResult.ok) {
        IncrementalLogService.error(initResult.error, 'VectorIndexService.indexDirectory');
        return err(initResult.error);
      }

      // 3. Escaneia arquivos
      const filesResult = await this.scanFiles(resolvedDir);
      if (!filesResult.ok) {
        IncrementalLogService.error(filesResult.error, 'VectorIndexService.indexDirectory');
        return err(filesResult.error);
      }

      const files = filesResult.value;
      let processedFiles = 0;
      let processedChunks = 0;
      const errors: Array<{ file: string; error: string }> = [];

      // 4. Processa cada arquivo com BATCHING
      for (const filePath of files) {
        const relativeFilePath = relative(resolvedDir, filePath);

        try {
          // 4a. Coleta chunks do arquivo
          const fileChunks: Array<{ text: string; index: number }> = [];
          for await (const chunk of ChunkService.streamChunks(filePath)) {
            fileChunks.push(chunk);
          }

          // 4b. Processa em batches
          for (let i = 0; i < fileChunks.length; i += config.batchSize) {
            const batch = fileChunks.slice(i, i + config.batchSize);

            // Enfileira processamento do batch (p-queue controla concorrência)
            await this.queue.add(async () => {
              try {
                // Gera embeddings em batch
                const texts = batch.map(c => c.text);
                const embResult = await EmbeddingService.generateBatchEmbeddings(texts);

                if (!embResult.ok) {
                  for (const chunk of batch) {
                    errors.push({
                      file: relativeFilePath,
                      error: `Chunk ${chunk.index}: ${embResult.error.message}`,
                    });
                  }
                  return;
                }

                // Salva todos os chunks do batch no banco
                const embeddings = embResult.value;
                for (let j = 0; j < batch.length; j++) {
                  const chunk = batch[j];
                  const embedding = embeddings[j];

                  const saveResult = VectorDatabaseService.saveChunk({
                    filePath: relativeFilePath,
                    chunkIndex: chunk.index,
                    chunkText: chunk.text,
                    embedding,
                  });

                  if (!saveResult.ok) {
                    errors.push({
                      file: relativeFilePath,
                      error: `Chunk ${chunk.index}: ${saveResult.error.message}`,
                    });
                  } else {
                    processedChunks++;
                  }
                }

                // Atualiza progresso
                if (onProgress) {
                  onProgress({
                    currentFile: relativeFilePath,
                    processedFiles,
                    totalFiles: files.length,
                    processedChunks,
                    errors: errors.length,
                  });
                }
              } catch (error) {
                for (const chunk of batch) {
                  errors.push({
                    file: relativeFilePath,
                    error: `Chunk ${chunk.index}: ${(error as Error).message}`,
                  });
                }
              }
            });
          }

          processedFiles++;

          // Atualiza progresso após terminar o arquivo
          if (onProgress) {
            onProgress({
              currentFile: relativeFilePath,
              processedFiles,
              totalFiles: files.length,
              processedChunks,
              errors: errors.length,
            });
          }
        } catch (error) {
          errors.push({
            file: relativeFilePath,
            error: (error as Error).message,
          });
        }
      }

      // 5. Aguarda todas as operações na fila terminarem
      await this.queue.onIdle();

      // 6. Salva metadata
      const metadataResult = VectorDatabaseService.saveMetadata({
        last_indexed_at: Date.now(),
        total_files: processedFiles,
        total_chunks: processedChunks,
        embedding_model: 'qwen/qwen3-embedding-8b',
        chunk_size: config.chunkSize,
        chunk_overlap: config.chunkOverlap,
      });

      if (!metadataResult.ok) {
        IncrementalLogService.error(metadataResult.error, 'VectorIndexService.indexDirectory');
        return err(metadataResult.error);
      }

      const duration = Date.now() - startTime;

      IncrementalLogService.system('Directory indexing completed', 'VectorIndexService', {
        totalFiles: files.length,
        processedFiles,
        totalChunks: processedChunks,
        errors: errors.length,
        durationMs: duration,
      });

      return ok({
        totalFiles: files.length,
        processedFiles,
        totalChunks: processedChunks,
        errors,
        duration,
      });
    } catch (error) {
      IncrementalLogService.error(error as Error, 'VectorIndexService.indexDirectory', {
        dirPath,
      });
      return err(error as Error);
    } finally {
      // Limpa a fila
      this.queue = null;
    }
  }

  /**
   * Escaneia recursivamente todos os arquivos permitidos no diretório
   */
  private static async scanFiles(dirPath: string): Promise<Result<string[]>> {
    const files: string[] = [];

    async function scanRecursive(currentPath: string): Promise<void> {
      try {
        const entries = await readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = join(currentPath, entry.name);

          if (entry.isDirectory()) {
            // Ignora diretórios na blacklist
            if (VectorIndexService.IGNORED_DIRS.has(entry.name)) {
              continue;
            }
            // Ignora diretórios que começam com '.'
            if (entry.name.startsWith('.')) {
              continue;
            }
            await scanRecursive(fullPath);
          } else if (entry.isFile()) {
            // Ignora arquivos que começam com '.'
            if (entry.name.startsWith('.')) {
              continue;
            }
            // Filtra por extensão
            const ext = extname(entry.name).toLowerCase();
            if (VectorIndexService.ALLOWED_EXTENSIONS.has(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Ignora erros de permissão e continua
        if ((error as NodeJS.ErrnoException).code !== 'EACCES') {
          throw error;
        }
      }
    }

    try {
      await scanRecursive(dirPath);
      return ok(files);
    } catch (error) {
      return err(error as Error);
    }
  }

  /**
   * Busca semanticamente nos arquivos indexados
   */
  static async search(
    query: string,
    dirPath: string,
    topK: number = 5
  ): Promise<Result<SearchResult[]>> {
    try {
      IncrementalLogService.system('Starting semantic search', 'VectorIndexService', {
        queryLength: query.length,
        dirPath,
        topK,
      });

      // 1. Inicializa o banco com o caminho do diretório
      const dbPath = this.resolveDbPath(dirPath);
      const initResult = VectorDatabaseService.init(dbPath);
      if (!initResult.ok) {
        IncrementalLogService.error(initResult.error, 'VectorIndexService.search');
        return err(initResult.error);
      }

      // 2. Gera embedding da query
      const queryEmbResult = await EmbeddingService.generateEmbedding(query);
      if (!queryEmbResult.ok) {
        return err(queryEmbResult.error);
      }

      const queryEmb = queryEmbResult.value;

      // 3. Carrega todos os chunks do banco
      const chunksResult = VectorDatabaseService.getAllChunks();
      if (!chunksResult.ok) {
        IncrementalLogService.error(chunksResult.error, 'VectorIndexService.search');
        return err(chunksResult.error);
      }

      const chunks = chunksResult.value;

      if (chunks.length === 0) {
        IncrementalLogService.system('No chunks found in index', 'VectorIndexService');
        return ok([]);
      }

      // 4. Calcula similaridade para cada chunk
      const results = chunks.map((chunk) => {
        // Converte Float32Array para array normal para cosine-similarity
        const chunkArray = Array.from(chunk.embedding);
        const queryArray = Array.from(queryEmb);

        const similarity = cosineSimilarity(queryArray, chunkArray);

        return {
          filePath: chunk.filePath,
          chunkText: chunk.chunkText,
          chunkIndex: chunk.chunkIndex,
          similarity,
        };
      });

      // 5. Ordena por similaridade (maior primeiro) e retorna top K
      results.sort((a, b) => b.similarity - a.similarity);

      const topResults = results.slice(0, topK);

      IncrementalLogService.system('Search completed', 'VectorIndexService', {
        totalChunks: chunks.length,
        resultsReturned: topResults.length,
        topSimilarity: topResults[0]?.similarity,
      });

      return ok(topResults);
    } catch (error) {
      IncrementalLogService.error(error as Error, 'VectorIndexService.search', {
        query: query.substring(0, 100),
      });
      return err(error as Error);
    }
  }

  /**
   * Limpa todo o índice
   */
  static clearIndex(dirPath: string): Result<void> {
    IncrementalLogService.system('Clearing vector index', 'VectorIndexService', { dirPath });

    const dbPath = this.resolveDbPath(dirPath);
    const initResult = VectorDatabaseService.init(dbPath);
    if (!initResult.ok) {
      IncrementalLogService.error(initResult.error, 'VectorIndexService.clearIndex');
      return err(initResult.error);
    }

    const clearResult = VectorDatabaseService.clearIndex();

    if (clearResult.ok) {
      IncrementalLogService.system('Vector index cleared successfully', 'VectorIndexService');
    } else {
      IncrementalLogService.error(clearResult.error, 'VectorIndexService.clearIndex');
    }

    return clearResult;
  }

  /**
   * Obtém metadata do índice
   */
  static getIndexMetadata(dirPath: string): Result<{
    lastIndexedAt: Date | null;
    totalFiles: number;
    totalChunks: number;
  }> {
    const dbPath = this.resolveDbPath(dirPath);
    const initResult = VectorDatabaseService.init(dbPath);
    if (!initResult.ok) {
      return err(initResult.error);
    }

    const metadataResult = VectorDatabaseService.getMetadata();
    if (!metadataResult.ok) {
      return err(metadataResult.error);
    }

    const metadata = metadataResult.value;

    if (!metadata) {
      return ok({
        lastIndexedAt: null,
        totalFiles: 0,
        totalChunks: 0,
      });
    }

    return ok({
      lastIndexedAt: metadata.last_indexed_at
        ? new Date(metadata.last_indexed_at)
        : null,
      totalFiles: metadata.total_files,
      totalChunks: metadata.total_chunks,
    });
  }
}
