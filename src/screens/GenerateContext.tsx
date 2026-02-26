import { useState } from "react";
import { AppConfig } from "../types";
import { ContextService } from "../services/ContextService";
import { GeminiService } from "../services/GeminiService";
import { FileService } from "../services/FileService";
import { join } from "path";
import { useKeyboard } from "@opentui/react";

interface Props {
  config: AppConfig;
  onBack: () => void;
  onError: (msg: string) => void;
}

export function GenerateContext({ config, onBack, onError }: Props) {
  const [projectPath, setProjectPath] = useState(process.cwd());
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultPath, setResultPath] = useState("");

  useKeyboard((key) => {
    if (key.name === "escape") onBack();
    if (step === 2 && key.name === "return") processContext();
    if (step === 3 && key.name === "return") onBack();
  });

  const handlePathSubmit = async (val: string) => {
    setProjectPath(val);
    const res = await ContextService.readProjectFiles(val);
    if (res.ok) {
      setFiles(res.value);
      setStep(2);
    } else {
      onError(res.error.message);
    }
  };

  const processContext = async () => {
    setIsProcessing(true);
    const contentRes = await ContextService.getContextString(files);
    if (!contentRes.ok) {
      onError(contentRes.error.message);
      setIsProcessing(false);
      return;
    }

    const prompt = `Analise os seguintes arquivos do projeto e gere um resumo de contexto útil para outras interações com IA. Explique a estrutura, stack principal e propósito.\n\n${contentRes.value}`;
    const iaRes = await GeminiService.generate(prompt);
    if (!iaRes.ok) {
      onError(iaRes.error.message);
      setIsProcessing(false);
      return;
    }

    const projectName = projectPath.split(/[\\/]/).pop() || "projeto";
    const filename = `contexto-${projectName}-${Date.now()}.md`;
    const outPath = join(config.outputDir, filename);

    const saveRes = await FileService.saveFile(outPath, iaRes.value);
    if (!saveRes.ok) {
      onError(saveRes.error.message);
    } else {
      setResultPath(outPath);
      setStep(3);
    }
    setIsProcessing(false);
  };

  return (
    <box flexDirection="column">
      <text><strong>Gerar Contexto (Esc para voltar)</strong></text>
      
      {step === 1 && (
        <box flexDirection="column">
          <text>Caminho do projeto: </text>
          <box style={{ height: 1 }}>
            <input value={projectPath} focused onInput={setProjectPath} onSubmit={(val: any) => handlePathSubmit(val)} />
          </box>
        </box>
      )}

      {step === 2 && !isProcessing && (
        <box flexDirection="column">
          <text>Encontrados {files.length} arquivos válidos.</text>
          <text>Pressione Enter para enviar ao Gemini e gerar contexto.</text>
        </box>
      )}

      {isProcessing && (
        <box>
          <text><span fg="yellow">Processando arquivos e gerando contexto...</span></text>
        </box>
      )}

      {step === 3 && (
        <box flexDirection="column">
          <text><span fg="green">Contexto salvo em: {resultPath}</span></text>
          <text>Pressione Enter para voltar.</text>
        </box>
      )}
    </box>
  );
}