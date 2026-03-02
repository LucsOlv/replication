import axios, { AxiosError } from 'axios';
import { Result, ok, err } from '../utils/result';
import { EmbeddingError, ConfigError } from '../utils/errors';
import { ConfigService } from './ConfigService';
import { IncrementalLogService } from './IncrementalLogService';
import type { EmbeddingResponse } from '../types/vectorIndex';

export class EmbeddingService {
  private static readonly API_URL = 'https://openrouter.ai/api/v1/embeddings';
  private static readonly MODEL = 'qwen/qwen3-embedding-8b';
  private static readonly TIMEOUT = 30000; // 30 segundos

  /**
   * Obtém a API Key do ConfigService com fallback para variável de ambiente
   */
  private static async getApiKey(): Promise<Result<string, ConfigError | EmbeddingError>> {
    // Tenta carregar do ConfigService primeiro
    const configResult = await ConfigService.load();

    if (configResult.ok && configResult.value.apiKey) {
      return ok(configResult.value.apiKey);
    }

    // Fallback para variável de ambiente
    const envApiKey = process.env.OPENROUTER_API_KEY;
    if (envApiKey) {
      return ok(envApiKey);
    }

    // Nenhuma API Key encontrada
    const errorMsg = 'API Key não configurada. Configure nas Configurações ou adicione OPENROUTER_API_KEY no arquivo .env';
    const error = new EmbeddingError(errorMsg);
    IncrementalLogService.embeddingError(error, 'EmbeddingService.getApiKey');
    return err(error);
  }

  static async generateEmbedding(text: string): Promise<Result<Float32Array, EmbeddingError | ConfigError>> {
    try {
      // 1. Obtém API Key
      const apiKeyResult = await this.getApiKey();
      if (!apiKeyResult.ok) {
        return err(apiKeyResult.error);
      }
      const apiKey = apiKeyResult.value;

      // 2. Limita o tamanho do texto para evitar erros de token
      const truncatedText = text.slice(0, 8000);

      // 3. Faz requisição para API
      const requestPayload = {
        model: this.MODEL,
        input: truncatedText,
      };

      const response = await axios.post<EmbeddingResponse>(
        this.API_URL,
        requestPayload,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/replication-tui',
            'X-Title': 'Replication TUI',
          },
          timeout: this.TIMEOUT,
        }
      );

      // 4. Valida resposta
      if (!response.data.data || response.data.data.length === 0) {
        const errorMsg = 'Resposta vazia da API de embeddings';
        const error = new EmbeddingError(errorMsg);
        IncrementalLogService.embeddingError(error, 'EmbeddingService.generateEmbedding');
        return err(error);
      }

      // 5. Converte para Float32Array
      const embeddingArray = response.data.data[0].embedding;
      const embedding = new Float32Array(embeddingArray);

      return ok(embedding);
    } catch (error) {
      if (error instanceof AxiosError) {
        const message = error.response?.data?.error?.message || error.message;
        const embeddingError = new EmbeddingError(`Erro ao gerar embedding: ${message}`);
        IncrementalLogService.embeddingError(embeddingError, 'EmbeddingService.generateEmbedding', {
          status: error.response?.status,
          statusText: error.response?.statusText,
        });
        return err(embeddingError);
      }

      const embeddingError = new EmbeddingError(`Erro inesperado ao gerar embedding: ${(error as Error).message}`);
      IncrementalLogService.embeddingError(embeddingError, 'EmbeddingService.generateEmbedding');
      return err(embeddingError);
    }
  }

  static async generateBatchEmbeddings(texts: string[]): Promise<Result<Float32Array[], EmbeddingError | ConfigError>> {
    try {
      // 1. Obtém API Key
      const apiKeyResult = await this.getApiKey();
      if (!apiKeyResult.ok) {
        return err(apiKeyResult.error);
      }
      const apiKey = apiKeyResult.value;

      // 2. Limita o tamanho dos textos
      const truncatedTexts = texts.map(text => text.slice(0, 8000));

      // 3. Faz requisição para API
      const requestPayload = {
        model: this.MODEL,
        input: truncatedTexts,
      };

      const response = await axios.post<EmbeddingResponse>(
        this.API_URL,
        requestPayload,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/replication-tui',
            'X-Title': 'Replication TUI',
          },
          timeout: this.TIMEOUT * 2, // Mais tempo para batch
        }
      );

      // 4. Valida resposta
      if (!response.data.data || response.data.data.length === 0) {
        const errorMsg = 'Resposta vazia da API de embeddings (batch)';
        const error = new EmbeddingError(errorMsg);
        IncrementalLogService.embeddingError(error, 'EmbeddingService.generateBatchEmbeddings');
        return err(error);
      }

      // 5. Converte para Float32Array[]
      const embeddings = response.data.data.map(
        item => new Float32Array(item.embedding)
      );

      return ok(embeddings);
    } catch (error) {
      if (error instanceof AxiosError) {
        const message = error.response?.data?.error?.message || error.message;
        const embeddingError = new EmbeddingError(`Erro ao gerar batch de embeddings: ${message}`);
        IncrementalLogService.embeddingError(embeddingError, 'EmbeddingService.generateBatchEmbeddings', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          count: texts.length,
        });
        return err(embeddingError);
      }

      const embeddingError = new EmbeddingError(`Erro inesperado ao gerar batch de embeddings: ${(error as Error).message}`);
      IncrementalLogService.embeddingError(embeddingError, 'EmbeddingService.generateBatchEmbeddings', {
        count: texts.length,
      });
      return err(embeddingError);
    }
  }
}
