import { join } from "path";
import { Result, ok, err, tryAsync } from "../utils/result";
import { FileSystemError } from "../utils/errors";
import { SavedPrompt } from "../types";

export class FileService {
  static async readDir(dir: string): Promise<Result<SavedPrompt[], FileSystemError>> {
    const result = await tryAsync(async () => {
      const fs = await import("fs/promises");
      const exists = await fs.access(dir).then(() => true).catch(() => false);
      if (!exists) {
        return [];
      }
      const files = await fs.readdir(dir);
      const prompts: SavedPrompt[] = [];
      for (const file of files) {
        if (file.endsWith(".xml") || file.endsWith(".md")) {
          const path = join(dir, file);
          const stat = await fs.stat(path);
          prompts.push({
            name: file,
            path,
            createdAt: stat.birthtime,
            size: stat.size,
          });
        }
      }
      return prompts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }, "FileService.readDir");

    if (!result.ok) {
      return err(new FileSystemError(result.error.message));
    }
    return ok(result.value);
  }

  static async readFile(path: string): Promise<Result<string, FileSystemError>> {
    const result = await tryAsync(async () => {
      const fs = await import("fs/promises");
      return fs.readFile(path, "utf-8");
    }, "FileService.readFile");

    if (!result.ok) {
      return err(new FileSystemError(result.error.message));
    }
    return ok(result.value);
  }

  static async saveFile(path: string, content: string): Promise<Result<void, FileSystemError>> {
    const result = await tryAsync(async () => {
      const fs = await import("fs/promises");
      const { dirname } = await import("path");
      await fs.mkdir(dirname(path), { recursive: true });
      await fs.writeFile(path, content, "utf-8");
    }, "FileService.saveFile");

    if (!result.ok) {
      return err(new FileSystemError(result.error.message));
    }
    return ok(undefined);
  }

  static async deleteFile(path: string): Promise<Result<void, FileSystemError>> {
    const result = await tryAsync(async () => {
      const fs = await import("fs/promises");
      await fs.unlink(path);
    }, "FileService.deleteFile");

    if (!result.ok) {
      return err(new FileSystemError(result.error.message));
    }
    return ok(undefined);
  }
}