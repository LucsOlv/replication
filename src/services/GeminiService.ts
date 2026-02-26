import { GoogleGenerativeAI } from "@google/generative-ai";
import { Result, ok, err, tryAsync } from "../utils/result";
import { GeminiError, ConfigError } from "../utils/errors";
import { ConfigService } from "./ConfigService";

export class GeminiService {
  static async generate(prompt: string, modelOverride?: string): Promise<Result<string, GeminiError | ConfigError>> {
    const configResult = await ConfigService.load();
    if (!configResult.ok) {
      return err(new ConfigError(`Falha ao ler configuração para Gemini: ${configResult.error.message}`));
    }
    const config = configResult.value;
    if (!config.apiKey) {
      return err(new ConfigError("API Key não configurada. Configure nas Configurações."));
    }

    const modelName = modelOverride || config.model || "gemini-1.5-pro";

    const result = await tryAsync(async () => {
      const genAI = new GoogleGenerativeAI(config.apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });
      const response = await model.generateContent(prompt);
      return response.response.text();
    }, "GeminiService.generate");

    if (!result.ok) {
      return err(new GeminiError(result.error.message));
    }

    return ok(result.value);
  }

  static async enhanceInstruction(instruction: string): Promise<Result<string, GeminiError | ConfigError>> {
    const prompt = `Melhore a seguinte instrução para um prompt de IA. Torne-a mais clara, direta e detalhada, preservando o objetivo original. Retorne APENAS a instrução melhorada. Instrução original: ${instruction}`;
    return this.generate(prompt);
  }
}