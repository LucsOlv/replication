import { join } from "path";
import { Technique, Format } from "../types";
import { Result, ok, err } from "../utils/result";
import { FileSystemError, OpenRouterError } from "../utils/errors";
import { FileService } from "./FileService";
import { TemplateService } from "./TemplateService";
import { OpenRouterService } from "./OpenRouterService";

export class PromptBuilder {
  static async build(
    task: string,
    instruction: string,
    format: Format,
    techniques: Technique[],
    patterns?: string,
    context?: string
  ): Promise<Result<string, FileSystemError | OpenRouterError | Error>> {

    // 1. Build the composed template using TemplateService
    let composedPrompt: string;

    if (format.id === "xml") {
      const templateResult = await TemplateService.buildFromTechniques(
        task,
        instruction,
        techniques,
        patterns,
        context
      );
      if (!templateResult.ok) {
        return err(templateResult.error);
      }
      composedPrompt = templateResult.value;
    } else {
      composedPrompt = TemplateService.buildMarkdownFromTechniques(
        task,
        instruction,
        techniques,
        patterns,
        context
      );
    }

    // 2. Call AI to generate the final prompt
    const metaPrompt = `Você é um especialista em prompt engineering. Abaixo está um template estruturado com placeholders no formato {{PLACEHOLDER}}. Sua tarefa é:

1. Ler o template e a descrição da tarefa do usuário
2. Preencher TODOS os placeholders {{...}} com conteúdo relevante e profissional baseado na tarefa descrita
3. Manter a estrutura e formato do template (${format.id.toUpperCase()})
4. Remover comentários do template (<!-- ... -->)
5. Retornar APENAS o prompt final preenchido, sem explicações

TAREFA DO USUÁRIO: ${instruction}

TEMPLATE A PREENCHER:
${composedPrompt}`;

    const aiResult = await OpenRouterService.generate(metaPrompt);
    if (!aiResult.ok) {
      return err(aiResult.error);
    }

    return ok(aiResult.value);
  }

  static async save(
    promptContent: string,
    task: string,
    format: Format,
    outputDir: string
  ): Promise<Result<string, FileSystemError | Error>> {
    const slug = task.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const timestamp = Date.now();
    const ext = format.id === "xml" ? "xml" : (format.id === "markdown" ? "md" : "txt");
    const filename = `${slug || 'prompt'}-${timestamp}.${ext}`;
    const filePath = join(outputDir, filename);

    const saveResult = await FileService.saveFile(filePath, promptContent);
    if (!saveResult.ok) {
      return err(saveResult.error);
    }

    return ok(filePath);
  }
}