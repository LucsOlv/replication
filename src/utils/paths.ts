import { join } from 'path';
import { homedir } from 'os';

/**
 * Centraliza todos os caminhos de arquivos e diretórios do Replication TUI
 * 
 * Estrutura:
 * ~/.replication/              - Configuração GLOBAL (API key, etc)
 * ./projeto/.replication/      - Dados LOCAIS por projeto
 */
export class ReplicationPaths {
  // ==================== Diretórios Base ====================
  
  /**
   * Retorna o diretório do projeto atual (onde o TUI foi executado)
   */
  static getProjectRoot(): string {
    return (global as any).__USER_PROJECT_ROOT || process.cwd();
  }

  /**
   * Retorna o diretório .replication/ local do projeto
   */
  static getLocalReplicationDir(): string {
    return join(this.getProjectRoot(), '.replication');
  }

  /**
   * Retorna o diretório .replication/ global do usuário
   */
  static getGlobalReplicationDir(): string {
    return join(homedir(), '.replication');
  }

  // ==================== Configurações ====================

  /**
   * Retorna o caminho da config global (~/.replication/config.json)
   * Contém: API key, modelo padrão, preferências globais
   */
  static getGlobalConfig(): string {
    return join(this.getGlobalReplicationDir(), 'config.json');
  }

  /**
   * Retorna o caminho da config local (./.replication/config.json)
   * Contém: Overrides específicos do projeto (opcional)
   */
  static getLocalConfig(): string {
    return join(this.getLocalReplicationDir(), 'config.json');
  }

  // ==================== Data (Banco Vetorial) ====================

  /**
   * Retorna o diretório de dados (./.replication/data/)
   */
  static getDataDir(): string {
    return join(this.getLocalReplicationDir(), 'data');
  }

  /**
   * Retorna o caminho do banco vetorial SQLite (./.replication/data/vector-index.db)
   */
  static getVectorDb(): string {
    return join(this.getDataDir(), 'vector-index.db');
  }

  // ==================== Logs ====================

  /**
   * Retorna o diretório raiz de logs (./.replication/logs/)
   */
  static getLogsDir(): string {
    return join(this.getLocalReplicationDir(), 'logs');
  }

  /**
   * Retorna o caminho do log de sistema (./.replication/logs/system.log)
   * Contém: console.log, info, debug, operações gerais
   */
  static getSystemLog(): string {
    return join(this.getLogsDir(), 'system.log');
  }

  /**
   * Retorna o caminho do log de erros (./.replication/logs/errors.log)
   * Contém: Erros críticos, exceptions, falhas
   */
  static getErrorsLog(): string {
    return join(this.getLogsDir(), 'errors.log');
  }

  /**
   * Retorna o caminho do log de erros de embedding (./.replication/logs/embedding.log)
   * Contém: APENAS erros de embedding (sucessos NÃO são logados)
   */
  static getEmbeddingLog(): string {
    return join(this.getLogsDir(), 'embedding.log');
  }

  /**
   * Retorna o diretório de logs de API (./.replication/logs/api/)
   */
  static getApiLogsDir(): string {
    return join(this.getLogsDir(), 'api');
  }

  /**
   * Retorna o caminho do log de requisições API (./.replication/logs/api/requests.log)
   * Contém: Todas requisições à API (headers, body, timestamp)
   */
  static getApiRequestsLog(): string {
    return join(this.getApiLogsDir(), 'requests.log');
  }

  /**
   * Retorna o caminho do log de respostas API (./.replication/logs/api/responses.log)
   * Contém: Todas respostas da API (status, body, timing)
   */
  static getApiResponsesLog(): string {
    return join(this.getApiLogsDir(), 'responses.log');
  }

  // ==================== Prompts ====================

  /**
   * Retorna o diretório de prompts gerados (./.replication/prompts/)
   */
  static getPromptsDir(): string {
    return join(this.getLocalReplicationDir(), 'prompts');
  }
}
