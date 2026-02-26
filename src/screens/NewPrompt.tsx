import { useState, useEffect } from "react";
import { AppConfig, Format, Technique } from "../types";
import { FileService } from "../services/FileService";
import { OpenRouterService } from "../services/OpenRouterService";
import { PromptBuilder } from "../services/PromptBuilder";
import { ScreenContainer } from "../components/ScreenContainer";
import { StepIndicator } from "../components/StepIndicator";
import { LoadingBox, SuccessBox } from "../components/StatusBox";
import { MenuSelect } from "../components/CustomSelect";
import { join } from "path";
import { useKeyboard } from "@opentui/react";

interface Props {
  config: AppConfig;
  onBack: () => void;
  onError: (msg: string) => void;
}

export function NewPrompt({ config, onBack, onError }: Props) {
  const [step, setStep] = useState(1);
  const [task, setTask] = useState("");
  const [formats, setFormats] = useState<Format[]>([]);
  const [format, setFormat] = useState<Format | null>(null);
  const [techniquesList, setTechniquesList] = useState<Technique[]>([]);
  const [selectedTechs, setSelectedTechs] = useState<Technique[]>([]);
  const [techIndex, setTechIndex] = useState(0);
  const [instruction, setInstruction] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultPath, setResultPath] = useState("");

  useEffect(() => {
    async function loadData() {
      const fResult = await FileService.readFile(join(process.cwd(), "config", "formats.json"));
      if (fResult.ok) setFormats(JSON.parse(fResult.value));
      const tResult = await FileService.readFile(join(process.cwd(), "config", "techniques.json"));
      if (tResult.ok) setTechniquesList(JSON.parse(tResult.value));
    }
    loadData();
  }, []);

  useKeyboard((key) => {
    if (key.name === "escape") onBack();

    if (step === 3) {
      if (key.name === "up") setTechIndex(Math.max(0, techIndex - 1));
      if (key.name === "down") setTechIndex(Math.min(techniquesList.length - 1, techIndex + 1));
      if (key.name === "space") {
        const t = techniquesList[techIndex];
        if (selectedTechs.find((x) => x.id === t.id)) {
          setSelectedTechs(selectedTechs.filter((x) => x.id !== t.id));
        } else {
          setSelectedTechs([...selectedTechs, t]);
        }
      }
      if (key.name === "return") setStep(4);
    }
    if (step === 4 && key.ctrl && key.name === "e") {
      handleEnhance();
    }
    if (step === 5 && key.name === "return") onBack();
  });

  const handleEnhance = async () => {
    setIsEnhancing(true);
    const res = await OpenRouterService.enhanceInstruction(instruction);
    if (res.ok) setInstruction(res.value);
    else onError(res.error.message);
    setIsEnhancing(false);
  };

  const handleGenerate = async (finalInstruction: string) => {
    setInstruction(finalInstruction);
    setIsGenerating(true);
    const res = await PromptBuilder.buildAndSave(
      task,
      finalInstruction,
      format || formats[0],
      selectedTechs,
      config.outputDir
    );
    if (res.ok) {
      setResultPath(res.value);
      setStep(5);
    } else {
      onError(res.error.message);
      onBack();
    }
    setIsGenerating(false);
  };

  const stepLabels = ["Tarefa", "Formato", "Tecnicas", "Instrucao", "Concluido"];

  return (
    <ScreenContainer title="Criar Novo Prompt" width={75} showStep={{ current: step, total: 5 }}>
      <StepIndicator current={step} total={5} labels={stepLabels} />

      {step === 1 && (
        <box flexDirection="column" gap={1}>
          <text>
            <span style={{ fg: "cyan" }}>Qual e a sua tarefa?</span>
          </text>
          <text>
            <span style={{ fg: "gray" }}>Descreva brevemente o que deseja:</span>
          </text>
          <box style={{ height: 1 }}>
            <input
              value={task}
              focused
              onInput={setTask}
              onSubmit={(val: any) => {
                setTask(val);
                setStep(2);
              }}
            />
          </box>
        </box>
      )}

      {step === 2 && (
        <box flexDirection="column" gap={1}>
          <text>
            <span style={{ fg: "cyan" }}>Selecione o formato do prompt:</span>
          </text>
          <MenuSelect
            options={formats.map((f) => ({
              name: f.name,
              description: f.description,
              value: f.id,
            }))}
            onSelect={(item: any) => {
              setFormat(formats.find((f) => f.id === item?.value) || formats[0]);
              setStep(3);
            }}
          />
        </box>
      )}

      {step === 3 && (
        <box flexDirection="column" gap={1}>
          <text>
            <span style={{ fg: "cyan" }}>Selecione as tecnicas:</span>
          </text>
          <text>
            <span style={{ fg: "gray" }}>(Espaco para selecionar, Enter para confirmar)</span>
          </text>
          <box flexDirection="column" gap={0}>
            {techniquesList.map((t, i) => (
              <text key={t.id}>
                <span style={{ fg: i === techIndex ? "magenta" : "white" }}>
                  {selectedTechs.find((x) => x.id === t.id) ? " ◉ " : " ○ "}
                  {t.name}
                  <span style={{ fg: "gray" }}> - {t.description}</span>
                </span>
              </text>
            ))}
          </box>
        </box>
      )}

      {step === 4 && !isGenerating && (
        <box flexDirection="column" gap={1}>
          <text>
            <span style={{ fg: "cyan" }}>Escreva a instrucao principal do prompt:</span>
          </text>
          <box style={{ height: 1 }}>
            <input value={instruction} focused onInput={setInstruction} onSubmit={(val: any) => handleGenerate(val)} />
          </box>
          <text>
            <span style={{ fg: "gray" }}>Ctrl+E para </span>
            <span style={{ fg: "yellow" }}>Melhorar instrucao com IA</span>
          </text>
          {isEnhancing && <LoadingBox message="Melhorando instrucao..." />}
        </box>
      )}

      {isGenerating && <LoadingBox message="Gerando prompt..." />}

      {step === 5 && (
        <SuccessBox message="Prompt salvo com sucesso!">
          <text>
            <span style={{ fg: "cyan" }}>{resultPath}</span>
          </text>
          <text>
            <span style={{ fg: "gray" }}>Pressione Enter para voltar ao menu.</span>
          </text>
        </SuccessBox>
      )}
    </ScreenContainer>
  );
}
