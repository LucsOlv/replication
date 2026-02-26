import { join } from "path";
import { Technique, Format } from "../types";
import { Result, ok, err, tryAsync } from "../utils/result";
import { FileSystemError, GeminiError } from "../utils/errors";
import { FileService } from "./FileService";
import { getTechniquesContent } from "../utils/promptTemplates";
import { GeminiService } from "./GeminiService";

export class PromptBuilder {
  static async buildAndSave(
    task: string,
    instruction: string,
    format: Format,
    techniques: Technique[],
    outputDir: string
  ): Promise<Result<string, FileSystemError | GeminiError | Error>> {
    
    // 1. Mount initial template content
    const templatePath = join(process.cwd(), "config", "templates", `prompt.${format.id === "xml" ? "xml" : "md"}`);
    
    // We try to read local template. If it fails, we provide fallback
    let templateContent = "";
    const templateResult = await FileService.readFile(templatePath);
    if (templateResult.ok) {
      templateContent = templateResult.value;
    } else {
      // Fallback if template doesn't exist
      if (format.id === "xml") {
        templateContent = `<?xml version="1.0" encoding="UTF-8"?>
<prompt>
<task>{{TASK}}</task>
<instruction>{{INSTRUCTION}}</instruction>
<techniques>{{TECHNIQUES_CONTENT}}</techniques>
</prompt>`;
      } else {
        templateContent = `# Tarefa
{{TASK}}

# Instrução
{{INSTRUCTION}}

# Técnicas
{{TECHNIQUES_CONTENT}}`;
      }
    }

    const techContent = getTechniquesContent(techniques);
    let composedPrompt = templateContent
      .replace("{{TASK}}", task)
      .replace("{{INSTRUCTION}}", instruction)
      .replace("{{TECHNIQUES_CONTENT}}", techContent);

    // 2. Call IA to generate the final prompt
    const metaPrompt = `Você é um especialista em prompt engineering. Dado o template estruturado abaixo e a tarefa do usuário, gere um prompt profissional, coeso e completo no formato solicitado (${format.id}), incorporando todas as técnicas marcadas. Retorne APENAS o prompt final, sem explicações adicionais.

${composedPrompt}`;

    const geminiResult = await GeminiService.generate(metaPrompt);
    if (!geminiResult.ok) {
      return err(geminiResult.error);
    }

    const finalPrompt = geminiResult.value;

    // 3. Save to disk
    const slug = task.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const timestamp = Date.now();
    const ext = format.id === "xml" ? "xml" : (format.id === "markdown" ? "md" : "txt");
    const filename = `${slug || 'prompt'}-${timestamp}.${ext}`;
    const filePath = join(outputDir, filename);

    const saveResult = await FileService.saveFile(filePath, finalPrompt);
    if (!saveResult.ok) {
      return err(saveResult.error);
    }

    return ok(filePath);
  }
}