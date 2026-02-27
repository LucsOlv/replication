import { join } from "path";
import { homedir } from "os";
import { z } from "zod";
import { AppConfig } from "../types";
import { ok, err, Result } from "../utils/result";
import { ConfigError, ValidationError, JsonParseError, BunFileError } from "../utils/errors";

const ConfigSchema = z.object({
  apiKey: z.string(),
  outputDir: z.string(),
  model: z.string(),
});

export class ConfigService {
  private static configPath = join(homedir(), ".replication", "config.json");

  static async getConfigPath(): Promise<string> {
    return this.configPath;
  }

  static async load(): Promise<Result<AppConfig, ConfigError | ValidationError | JsonParseError | BunFileError>> {
    try {
      const file = Bun.file(this.configPath);
      if (!await file.exists()) {
        return ok({ apiKey: "", outputDir: join(homedir(), "replication-prompts"), model: "google/gemini-2.5-flash" });
      }

      const data = await file.text();
      const parsedData = JSON.parse(data);

      const parsed = ConfigSchema.safeParse(parsedData);
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

  static async save(config: AppConfig): Promise<Result<void, BunFileError>> {
    try {
      const fs = await import("fs/promises");
      const dir = join(homedir(), ".replication");
      await fs.mkdir(dir, { recursive: true });
      await Bun.write(this.configPath, JSON.stringify(config, null, 2));
      return ok(undefined);
    } catch (e: any) {
      return err(new BunFileError(`Falha ao salvar Config: ${e.message}`));
    }
  }
}