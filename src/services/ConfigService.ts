import { join } from "path";
import { homedir } from "os";
import { z } from "zod";
import { AppConfig } from "../types";
import { ok, err, Result, tryAsync } from "../utils/result";
import { ConfigError, ValidationError } from "../utils/errors";

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

  static async load(): Promise<Result<AppConfig, ConfigError | ValidationError>> {
    const fileResult = await tryAsync(async () => {
      const fs = await import("fs/promises");
      const exists = await fs.access(this.configPath).then(() => true).catch(() => false);
      if (!exists) {
        return { apiKey: "", outputDir: join(homedir(), "replication-prompts"), model: "google/gemini-2.5-flash" };
      }
      const data = await fs.readFile(this.configPath, "utf-8");
      return JSON.parse(data);
    }, "ConfigService.load: readFile");

    if (!fileResult.ok) {
      return err(new ConfigError(fileResult.error.message));
    }

    const parsed = ConfigSchema.safeParse(fileResult.value);
    if (!parsed.success) {
      return err(new ValidationError(`Config inválida: ${parsed.error.message}`));
    }

    return ok(parsed.data);
  }

  static async save(config: AppConfig): Promise<Result<void, ConfigError>> {
    const saveResult = await tryAsync(async () => {
      const fs = await import("fs/promises");
      const dir = join(homedir(), ".replication");
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), "utf-8");
    }, "ConfigService.save: writeFile");

    if (!saveResult.ok) {
      return err(new ConfigError(saveResult.error.message));
    }

    return ok(undefined);
  }
}