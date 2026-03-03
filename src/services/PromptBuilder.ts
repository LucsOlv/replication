import { join } from "path";
import { Technique, Format } from "../types";
import { Result, ok, err } from "../utils/result";
import { BunFileError, OpenRouterError } from "../utils/errors";
import { FileService } from "./FileService";
import { TemplateService } from "./TemplateService";
import { OpenRouterService } from "./OpenRouterService";
import { IncrementalLogService } from "./IncrementalLogService";

export class PromptBuilder {
  static async build(
    task: string,
    instruction: string,
    format: Format,
    techniques: Technique[],
    patterns?: string,
    context?: string
  ): Promise<Result<string, BunFileError | OpenRouterError | Error>> {

    // Build XML template from selected techniques only
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

    const composedPrompt = templateResult.value;

    await IncrementalLogService.system("Montagem de Prompt", "PromptBuilder", { 
      task, 
      instruction, 
      format: format.id, 
      techniques: techniques.map(t => t.id) 
    });
    await IncrementalLogService.system("Template Composto (Pré-IA)", "PromptBuilder", { 
      templateLength: composedPrompt.length, 
      preview: composedPrompt.substring(0, 500) + "..." 
    });

    // Call AI to fill the template with ONLY what was specified
    const metaPrompt = `Você é um especialista em prompt engineering. Sua tarefa é:

1. Ler o template XML estruturado abaixo com placeholders {{PLACEHOLDER}}
2. Preencher APENAS os placeholders com base na instrução do usuário
3. Use SOMENTE as técnicas e seções presentes no template - NÃO adicione técnicas extras
4. NÃO crie passos ou seções adicionais além do que foi fornecido
5. Remover comentários XML (<!-- ... -->)
6. Manter a estrutura XML intacta
7. Retornar APENAS o XML final preenchido, sem explicações

IMPORTANTE: Seja objetivo e preencha apenas o necessário baseado na instrução. Se um placeholder não for relevante para a tarefa, use um valor genérico mínimo.

INSTRUÇÃO DO USUÁRIO: ${instruction}

TEMPLATE XML:
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
    const ext = "xml"; // Always XML now
    const filename = `${slug || 'prompt'}-${timestamp}.${ext}`;
    const filePath = join(outputDir, filename);

    const saveResult = await FileService.saveFile(filePath, promptContent);
    if (!saveResult.ok) {
      return err(saveResult.error);
    }

    return ok(filePath);
  }
}
