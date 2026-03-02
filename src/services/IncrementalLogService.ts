import { appendFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { existsSync } from 'fs';
import { ReplicationPaths } from '../utils/paths';

/**
 * Entrada de log em formato JSON Lines
 */
export interface LogEntry {
  timestamp: string;
  level: 'system' | 'error' | 'embedding' | 'api-request' | 'api-response';
  context?: string;
  message: string;
  data?: any;
}

/**
 * Serviço de log incremental (append-only)
 * 
 * Logs são escritos em formato JSON Lines (uma linha JSON por entrada)
 * Cada tipo de log tem seu próprio arquivo em .replication/logs/
 */
export class IncrementalLogService {
  /**
   * Escreve log incremental em arquivo específico
   * @private
   */
  private static async appendLog(filePath: string, entry: LogEntry): Promise<void> {
    try {
      // Garante que o diretório existe
      const dir = dirname(filePath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      // Formata entrada como JSON line (uma linha por log)
      const line = JSON.stringify(entry) + '\n';
      
      await appendFile(filePath, line, 'utf-8');
    } catch (error) {
      // Fallback: log no console se não conseguir escrever
      console.error('[IncrementalLogService] Failed to write log:', error);
      console.error('[IncrementalLogService] Original entry:', entry);
    }
  }

  /**
   * Log de sistema (console.log, info, debug, operações gerais)
   * Arquivo: .replication/logs/system.log
   */
  static async system(message: string, context?: string, data?: any): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'system',
      context,
      message,
      data,
    };
    await this.appendLog(ReplicationPaths.getSystemLog(), entry);
  }

  /**
   * Log de erro crítico
   * Arquivo: .replication/logs/errors.log
   */
  static async error(error: Error, context: string, data?: any): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      context,
      message: error.message,
      data: {
        name: error.name,
        stack: error.stack,
        ...data,
      },
    };
    await this.appendLog(ReplicationPaths.getErrorsLog(), entry);
  }

  /**
   * Log de erro de embedding (APENAS ERROS - sucessos NÃO são logados)
   * Arquivo: .replication/logs/embedding.log
   */
  static async embeddingError(error: Error, context: string, data?: any): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'embedding',
      context,
      message: error.message,
      data: {
        name: error.name,
        stack: error.stack,
        ...data,
      },
    };
    await this.appendLog(ReplicationPaths.getEmbeddingLog(), entry);
  }

  /**
   * Log de requisição API
   * Arquivo: .replication/logs/api/requests.log
   */
  static async apiRequest(url: string, method: string, headers?: any, body?: any): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'api-request',
      message: `${method} ${url}`,
      data: { method, url, headers, body },
    };
    await this.appendLog(ReplicationPaths.getApiRequestsLog(), entry);
  }

  /**
   * Log de resposta API
   * Arquivo: .replication/logs/api/responses.log
   */
  static async apiResponse(url: string, status: number, body?: any, timing?: number): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'api-response',
      message: `${status} ${url}`,
      data: { url, status, body, timing },
    };
    await this.appendLog(ReplicationPaths.getApiResponsesLog(), entry);
  }

  /**
   * Lê logs de um arquivo (últimas N linhas)
   * @param filePath Caminho do arquivo de log
   * @param limit Número máximo de entradas a retornar (padrão: 100)
   * @returns Array de entradas de log (mais antigas primeiro)
   */
  static async readLogs(filePath: string, limit: number = 100): Promise<LogEntry[]> {
    try {
      if (!existsSync(filePath)) {
        return [];
      }

      const content = await Bun.file(filePath).text();
      const lines = content.trim().split('\n');
      
      // Pega as últimas N linhas
      const lastLines = lines.slice(-limit);
      
      return lastLines
        .map(line => {
          try {
            return JSON.parse(line) as LogEntry;
          } catch {
            return null;
          }
        })
        .filter((entry): entry is LogEntry => entry !== null);
    } catch {
      return [];
    }
  }

  /**
   * Utilitários para ler logs específicos
   */
  
  static async readSystemLogs(limit: number = 100): Promise<LogEntry[]> {
    return this.readLogs(ReplicationPaths.getSystemLog(), limit);
  }

  static async readErrorLogs(limit: number = 100): Promise<LogEntry[]> {
    return this.readLogs(ReplicationPaths.getErrorsLog(), limit);
  }

  static async readEmbeddingLogs(limit: number = 100): Promise<LogEntry[]> {
    return this.readLogs(ReplicationPaths.getEmbeddingLog(), limit);
  }

  static async readApiRequestLogs(limit: number = 100): Promise<LogEntry[]> {
    return this.readLogs(ReplicationPaths.getApiRequestsLog(), limit);
  }

  static async readApiResponseLogs(limit: number = 100): Promise<LogEntry[]> {
    return this.readLogs(ReplicationPaths.getApiResponsesLog(), limit);
  }
}
