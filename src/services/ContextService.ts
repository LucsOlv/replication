import { join } from "path";
import { Result, ok, err, tryAsync } from "../utils/result";
import { FileSystemError } from "../utils/errors";

export class ContextService {
  private static allowlist = [".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".xml", ".html", ".css"];
  private static denylist = ["node_modules", ".git", "dist", "build", ".next"];

  static async readProjectFiles(dir: string): Promise<Result<string[], FileSystemError>> {
    const result = await tryAsync(async () => {
      const fs = await import("fs/promises");
      const files: string[] = [];

      async function scan(currentDir: string) {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          if (ContextService.denylist.includes(entry.name)) continue;

          const fullPath = join(currentDir, entry.name);
          if (entry.isDirectory()) {
            await scan(fullPath);
          } else if (entry.isFile()) {
            const ext = fullPath.substring(fullPath.lastIndexOf("."));
            if (ContextService.allowlist.includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      }

      await scan(dir);
      return files;
    }, "ContextService.readProjectFiles");

    if (!result.ok) {
      return err(new FileSystemError(result.error.message));
    }
    return ok(result.value);
  }

  static async getContextString(files: string[]): Promise<Result<string, FileSystemError>> {
    const result = await tryAsync(async () => {
      const fs = await import("fs/promises");
      let context = "";
      for (const file of files) {
        try {
          const content = await fs.readFile(file, "utf-8");
          context += `
--- File: ${file} ---
${content}
`;
        } catch (e) {
           // Skip files that can't be read
        }
      }
      return context;
    }, "ContextService.getContextString");

    if (!result.ok) {
      return err(new FileSystemError(result.error.message));
    }
    return ok(result.value);
  }
}