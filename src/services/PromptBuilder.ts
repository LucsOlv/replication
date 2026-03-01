import { join } from "path";
import { Technique, Format } from "../types";
import { Result, ok, err } from "../utils/result";
import { BunFileError, OpenRouterError } from "../utils/errors";
import { FileService } from "./FileService";
import { TemplateService } from "./TemplateService";
import { OpenRouterService } from "./OpenRouterService";
import { LogService } from "./LogService";

export class PromptBuilder {
  static async build(
    task: string,
    instruction: string,
    format: Format,
    techniques: Technique[],
    patterns?: string,
    context?: string
  ): Promise<Result<string, BunFileError | OpenRouterError | Error>> {

    interface FormatStrategy {
      build(task: string, instruction: string, techniques: Technique[], patterns?: string, context?: string): Promise<Result<string, Error>> | Result<string, Error>;
    }

    const formatStrategies: Record<string, FormatStrategy> = {
      xml: {
        build: async (t, i, tech, p, c) => {
          return await TemplateService.buildFromTechniques(t, i, tech, p, c);
        }
      },
      markdown: {
        build: (t, i, tech, p, c) => {
          const result = TemplateService.buildMarkdownFromTechniques(t, i, tech, p, c);
          return ok(result);
        }
      }
    };

    const strategy = formatStrategies[format.id] || formatStrategies["markdown"];
    const templateResult = await strategy.build(task, instruction, techniques, patterns, context);

    if (!templateResult.ok) {
      return err(templateResult.error);
    }

    const composedPrompt = templateResult.value;

    const interactionId = await LogService.logInfo("Montagem de Prompt", { task, instruction, format: format.id, techniques: techniques.map(t => t.id) });
    await LogService.logInfo("Template Composto (Pré-IA)", { templateLength: composedPrompt.length, preview: composedPrompt.substring(0, 500) + "..." }, interactionId);

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
  ): Promise<Result<string, BunFileError | Error>> {
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