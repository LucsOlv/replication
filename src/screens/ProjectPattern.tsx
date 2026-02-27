import { useState } from "react";
import { AppConfig } from "../types";
import { ContextService } from "../services/ContextService";
import { OpenRouterService } from "../services/OpenRouterService";
import { FileService } from "../services/FileService";
import { ScreenContainer } from "../components/ScreenContainer";
import { StepIndicator } from "../components/StepIndicator";
import { LoadingBox, SuccessBox } from "../components/StatusBox";
import { join } from "path";
import { useKeyboard } from "@opentui/react";

import { useAppStore } from "../store/useAppStore";

interface Props {
  onBack: () => void;
}

export function ProjectPattern({ onBack }: Props) {
  const { config, setError } = useAppStore();
  const [projectPath, setProjectPath] = useState(process.cwd());
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultPath, setResultPath] = useState("");

  useKeyboard((key) => {
    if (key.name === "escape") onBack();
    if (step === 2 && key.name === "return") processPattern();
    if (step === 3 && key.name === "return") onBack();
  });

  const handlePathSubmit = async (val: string) => {
    setProjectPath(val);
    const res = await ContextService.readProjectFiles(val);
    if (res.ok) {
      setFiles(res.value);
      setStep(2);
    } else {
      setError(res.error.message);
    }
  };

  const processPattern = async () => {
    setIsProcessing(true);
    const contentRes = await ContextService.getContextString(files);
    if (!contentRes.ok) {
      setError(contentRes.error.message);
      setIsProcessing(false);
      return;
    }

    const prompt = `Analise a estrutura e o codigo do projeto abaixo. Identifique a stack de tecnologias, padroes de arquitetura usados, detecte inconsistencias e gere um documento PATTERNS.md recomendando boas praticas para padronizacao e refatoracao deste projeto.\n\n${contentRes.value}`;
    const iaRes = await OpenRouterService.generate(prompt);
    if (!iaRes.ok) {
      setError(iaRes.error.message);
      setIsProcessing(false);
      return;
    }

    if (!config) return;

    const projectName = projectPath.split(/[\\/]/).pop() || "projeto";
    const filename = `padrao-${projectName}-${Date.now()}.md`;
    const outPath = join(config.outputDir, filename);

    const saveRes = await FileService.saveFile(outPath, iaRes.value);
    if (!saveRes.ok) {
      setError(saveRes.error.message);
    } else {
      setResultPath(outPath);
      setStep(3);
    }
    setIsProcessing(false);
  };

  const stepLabels = ["Caminho", "Analisar", "Concluido"];

  return (
    <ScreenContainer title="Gerar Padrao de Projeto" showStep={{ current: step, total: 3 }}>
      <StepIndicator current={step} total={3} labels={stepLabels} />

      {step === 1 && (
        <box flexDirection="column" gap={1}>
          <text>
            <span style={{ fg: "cyan" }}>Caminho do projeto:</span>
          </text>
          <box style={{ height: 1 }}>
            <input
              value={projectPath}
              focused
              onInput={setProjectPath}
              onSubmit={(val: any) => handlePathSubmit(val)}
            />
          </box>
        </box>
      )}

      {step === 2 && !isProcessing && (
        <box flexDirection="column" gap={1}>
          <text>
            <span style={{ fg: "green" }}>Encontrados {files.length} arquivos validos.</span>
          </text>
          <text>
            <span style={{ fg: "gray" }}>Pressione Enter para analisar padroes.</span>
          </text>
        </box>
      )}

      {isProcessing && <LoadingBox message="Analisando projeto e gerando padroes..." />}

      {step === 3 && (
        <SuccessBox message="Padroes salvos com sucesso!">
          <text>
            <span style={{ fg: "cyan" }}>{resultPath}</span>
          </text>
          <text>
            <span style={{ fg: "gray" }}>Pressione Enter para voltar.</span>
          </text>
        </SuccessBox>
      )}
    </ScreenContainer>
  );
}
