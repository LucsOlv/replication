import { createReadStream } from 'fs';
import { Result, ok, err } from '../utils/result';
import { IncrementalLogService } from './IncrementalLogService';
import type { Chunk } from '../types/vectorIndex';

export class ChunkService {
  private static readonly CHUNK_SIZE = 512;
  private static readonly CHUNK_OVERLAP = 50;

  /**
   * Gera chunks de um arquivo usando streaming para economizar memória.
   * Processa o arquivo em partes pequenas, nunca carregando todo o conteúdo na memória.
   * 
   * @param filePath Caminho do arquivo a ser processado
   * @param chunkSize Tamanho de cada chunk em caracteres (padrão: 512)
   * @param overlap Overlap entre chunks para manter contexto (padrão: 50)
   */
  static async *streamChunks(
    filePath: string,
    chunkSize: number = this.CHUNK_SIZE,
    overlap: number = this.CHUNK_OVERLAP
  ): AsyncGenerator<Chunk, void, unknown> {
    const stream = createReadStream(filePath, { encoding: 'utf8' });

    let buffer = '';
    let chunkIndex = 0;

    try {
      for await (const chunk of stream) {
        buffer += chunk;

        // Processa chunks completos
        while (buffer.length >= chunkSize) {
          const chunkText = buffer.slice(0, chunkSize);
          
          yield {
            text: chunkText,
            index: chunkIndex++,
          };

          // Move buffer com overlap para manter contexto
          buffer = buffer.slice(chunkSize - overlap);
        }
      }

      // Processa o último chunk (se sobrar algo)
      if (buffer.length > 0) {
        yield {
          text: buffer,
          index: chunkIndex,
        };
      }
    } catch (error) {
      const chunkError = new Error(`Erro ao processar arquivo ${filePath}: ${(error as Error).message}`);
      IncrementalLogService.error(chunkError, 'ChunkService.streamChunks', {
        filePath,
      });
      throw chunkError;
    } finally {
      stream.destroy();
    }
  }

  /**
   * Divide um texto em chunks (sem streaming, para textos já em memória)
   */
  static chunkText(
    text: string,
    chunkSize: number = this.CHUNK_SIZE,
    overlap: number = this.CHUNK_OVERLAP
  ): Result<Chunk[]> {
    try {
      const chunks: Chunk[] = [];
      let index = 0;
      let position = 0;

      while (position < text.length) {
        const end = Math.min(position + chunkSize, text.length);
        const chunkText = text.slice(position, end);

        chunks.push({
          text: chunkText,
          index: index++,
        });

        // Move posição com overlap
        position = end - overlap;
        
        // Evita loop infinito se overlap >= chunkSize
        if (position <= end - chunkSize) {
          position = end;
        }
      }

      return ok(chunks);
    } catch (error) {
      IncrementalLogService.error(error as Error, 'ChunkService.chunkText', {
        textLength: text.length,
        chunkSize,
        overlap,
      });
      return err(error as Error);
    }
  }

  /**
   * Estima o número de chunks que um arquivo terá
   */
  static async estimateChunkCount(
    filePath: string,
    chunkSize: number = this.CHUNK_SIZE
  ): Promise<Result<number>> {
    try {
      const fs = await import('fs/promises');
      const stats = await fs.stat(filePath);
      
      // Estimativa grosseira: tamanho do arquivo / chunk size
      // Não é exato porque não considera overlap, mas é rápido
      const estimate = Math.ceil(stats.size / chunkSize);
      
      return ok(estimate);
    } catch (error) {
      IncrementalLogService.error(error as Error, 'ChunkService.estimateChunkCount', {
        filePath,
      });
      return err(error as Error);
    }
  }
}
