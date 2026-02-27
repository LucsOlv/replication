import { join } from "path";
import { Result, ok, err } from "../utils/result";
import { FileSystemError, BunFileError } from "../utils/errors";
import { SavedPrompt } from "../types";

export class FileService {
  static async readDir(dir: string): Promise<Result<SavedPrompt[], FileSystemError | BunFileError>> {
    try {
      const fs = await import("fs/promises");
      const exists = await fs.access(dir).then(() => true).catch(() => false);
      if (!exists) {
        return ok([]);
      }

      const files = await fs.readdir(dir);
      const prompts: SavedPrompt[] = [];

      for (const file of files) {
        if (file.endsWith(".xml") || file.endsWith(".md")) {
          const path = join(dir, file);
          const bunFile = Bun.file(path);
          prompts.push({
            name: file,
            path,
            createdAt: new Date(bunFile.lastModified),
            size: bunFile.size,
          });
        }
      }
      return ok(prompts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (e: any) {
      return err(new BunFileError(`Falha ao ler diretorio Bun: ${e.message}`));
    }
  }

  static async readFile(path: string): Promise<Result<string, BunFileError>> {
    try {
      const file = Bun.file(path);
      if (!await file.exists()) {
        return err(new BunFileError(`Arquivo nao encontrado: ${path}`));
      }
      return ok(await file.text());
    } catch (e: any) {
      return err(new BunFileError(`Falha ao ler arquivo Bun: ${e.message}`));
    }
  }

  static async saveFile(path: string, content: string): Promise<Result<void, BunFileError>> {
    try {
      const fs = await import("fs/promises");
      const { dirname } = await import("path");
      await fs.mkdir(dirname(path), { recursive: true });
      await Bun.write(path, content);
      return ok(undefined);
    } catch (e: any) {
      return err(new BunFileError(`Falha ao salvar arquivo Bun: ${e.message}`));
    }
  }

  static async deleteFile(path: string): Promise<Result<void, BunFileError>> {
    try {
      const fs = await import("fs/promises");
      await fs.unlink(path);
      return ok(undefined);
    } catch (e: any) {
      return err(new BunFileError(`Falha ao apagar arquivo: ${e.message}`));
    }
  }
}