import { useState, useEffect } from "react";
import { AppConfig, Format, Technique } from "../types";
import { FileService } from "../services/FileService";
import { GeminiService } from "../services/GeminiService";
import { PromptBuilder } from "../services/PromptBuilder";
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
        if (selectedTechs.find(x => x.id === t.id)) {
          setSelectedTechs(selectedTechs.filter(x => x.id !== t.id));
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
    const res = await GeminiService.enhanceInstruction(instruction);
    if (res.ok) setInstruction(res.value);
    else onError(res.error.message);
    setIsEnhancing(false);
  };

  const handleGenerate = async (finalInstruction: string) => {
    setInstruction(finalInstruction);
    setIsGenerating(true);
    const res = await PromptBuilder.buildAndSave(task, finalInstruction, format || formats[0], selectedTechs, config.outputDir);
    if (res.ok) {
      setResultPath(res.value);
      setStep(5);
    } else {
      onError(res.error.message);
      onBack();
    }
    setIsGenerating(false);
  };

  return (
    <box flexDirection="column">
      {step === 1 && (
        <box flexDirection="column">
          <text>Qual é a sua tarefa? Descreva brevemente: </text>
          <box style={{ height: 1, marginTop: 1 }}>
            <input value={task} focused onInput={setTask} onSubmit={(val: any) => { setTask(val); setStep(2); }} />
          </box>
        </box>
      )}

      {step === 2 && (
        <box flexDirection="column">
          <text>Selecione o formato do prompt:</text>
          <box style={{ marginTop: 1, width: 60, border: true }}>
            <select
              key={`format-${formats.length}`}
              focused={true}
              style={{ height: formats.length }}
              options={formats.map(f => ({ name: `${f.name} - ${f.description}`, value: f.id, description: f.description }))}
              onSelect={(_, item) => {
                setFormat(formats.find(f => f.id === item?.value) || formats[0]);
                setStep(3);
              }}
            />
          </box>
        </box>
      )}

      {step === 3 && (
        <box flexDirection="column">
          <text>Selecione as técnicas (Espaço para selecionar, Enter para confirmar):</text>
          {techniquesList.map((t, i) => (
            <text key={t.id}>
              <span fg={i === techIndex ? "green" : "white"}>
                {selectedTechs.find(x => x.id === t.id) ? "[x]" : "[ ]"} {t.name} - {t.description}
              </span>
            </text>
          ))}
        </box>
      )}

      {step === 4 && !isGenerating && (
        <box flexDirection="column">
          <box flexDirection="column">
            <text>Escreva a instrução principal do prompt: </text>
            <box style={{ height: 1, marginTop: 1 }}>
              <input value={instruction} focused onInput={setInstruction} onSubmit={(val: any) => handleGenerate(val)} />
            </box>
          </box>
          <text>
            <span fg="gray">Pressione Ctrl+E para ✨ Melhorar instrução com IA</span>
          </text>
          {isEnhancing && <text><span fg="yellow">Melhorando instrução...</span></text>}
        </box>
      )}

      {isGenerating && (
        <box>
          <text><span fg="green">Gerando prompt...</span></text>
        </box>
      )}

      {step === 5 && (
        <box flexDirection="column">
          <text><span fg="green">Prompt salvo com sucesso em: {resultPath}</span></text>
          <text>Pressione Enter para voltar ao menu.</text>
        </box>
      )}
    </box>
  );
}