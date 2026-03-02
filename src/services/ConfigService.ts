import { z } from "zod";
import { AppConfig } from "../types";
import { ok, err, Result } from "../utils/result";
import { ConfigError, ValidationError, JsonParseError, BunFileError } from "../utils/errors";
import { ReplicationPaths } from "../utils/paths";

const ConfigSchema = z.object({
  apiKey: z.string(),
  outputDir: z.string(),
  model: z.string(),
});

/**
 * Serviço de configuração com suporte a config híbrida:
 * - Config Global (~/.replication/config.json): API key, modelo padrão
 * - Config Local (./.replication/config.json): Overrides por projeto (opcional)
 * 
 * Prioridade: defaults < global < local
 */
export class ConfigService {
  static async getConfigPath(): Promise<string> {
    return ReplicationPaths.getGlobalConfig();
  }

  /**
   * Carrega config com merge: global + local
   * Prioridade: local > global > defaults
   */
  static async load(): Promise<Result<AppConfig, ConfigError | ValidationError | JsonParseError | BunFileError>> {
    // Defaults
    const defaults: AppConfig = {
      apiKey: "",
      outputDir: ReplicationPaths.getPromptsDir(), // Local: ./.replication/prompts/
      model: "google/gemini-2.5-flash"
    };

    try {
      // 1. Tenta carregar config global (~/.replication/config.json)
      let globalConfig: Partial<AppConfig> = {};
      const globalFile = Bun.file(ReplicationPaths.getGlobalConfig());
      if (await globalFile.exists()) {
        const globalData = await globalFile.text();
        globalConfig = JSON.parse(globalData);
      }

      // 2. Tenta carregar config local (./.replication/config.json)
      let localConfig: Partial<AppConfig> = {};
      const localFile = Bun.file(ReplicationPaths.getLocalConfig());
      if (await localFile.exists()) {
        const localData = await localFile.text();
        localConfig = JSON.parse(localData);
      }

      // 3. Merge: defaults <- global <- local (local tem maior prioridade)
      const merged = {
        ...defaults,
        ...globalConfig,
        ...localConfig,
      };

      // 4. Valida com Zod
      const parsed = ConfigSchema.safeParse(merged);
      if (!parsed.success) {
        return err(new ValidationError(`Config inválida: ${parsed.error.message}`));
      }

      return ok(parsed.data);
    } catch (e: any) {
      if (e instanceof SyntaxError) {
        return err(new JsonParseError(`Erro ao parsear JSON: ${e.message}`));
      }
      return err(new BunFileError(`Falha ao carregar Config: ${e.message}`));
    }
  }

  /**
   * Salva config GLOBAL (API key sempre vai para ~/.replication/config.json)
   * Use este método para salvar API key e preferências globais
   */
  static async save(config: AppConfig): Promise<Result<void, BunFileError>> {
    return this.saveGlobal(config);
  }

  /**
   * Salva config GLOBAL (API key, modelo, etc)
   */
  static async saveGlobal(config: AppConfig): Promise<Result<void, BunFileError>> {
    try {
      const fs = await import("fs/promises");
      const dir = ReplicationPaths.getGlobalReplicationDir();
      await fs.mkdir(dir, { recursive: true });
      await Bun.write(ReplicationPaths.getGlobalConfig(), JSON.stringify(config, null, 2));
      return ok(undefined);
    } catch (e: any) {
      return err(new BunFileError(`Falha ao salvar Config Global: ${e.message}`));
    }
  }

  /**
   * Salva config LOCAL (overrides específicos do projeto)
   * Útil para projetos com configurações personalizadas
   */
  static async saveLocal(config: Partial<AppConfig>): Promise<Result<void, BunFileError>> {
    try {
      const fs = await import("fs/promises");
      const dir = ReplicationPaths.getLocalReplicationDir();
      await fs.mkdir(dir, { recursive: true });
      await Bun.write(ReplicationPaths.getLocalConfig(), JSON.stringify(config, null, 2));
      return ok(undefined);
    } catch (e: any) {
      return err(new BunFileError(`Falha ao salvar Config Local: ${e.message}`));
    }
  }
}