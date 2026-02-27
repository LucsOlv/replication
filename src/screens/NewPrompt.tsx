import { useState, useEffect } from "react";
import { AppConfig, Format, Technique } from "../types";
import { FileService } from "../services/FileService";
import { OpenRouterService } from "../services/OpenRouterService";
import { ContextService } from "../services/ContextService";
import { PromptBuilder } from "../services/PromptBuilder";
import { ScreenContainer } from "../components/ScreenContainer";
import { StepIndicator } from "../components/StepIndicator";
import { LoadingBox, SuccessBox, ErrorBox } from "../components/StatusBox";
import { MenuSelect } from "../components/CustomSelect";
import { join } from "path";
import { useKeyboard } from "@opentui/react";

interface Props {
  config: AppConfig;
  onBack: () => void;
  onError: (msg: string) => void;
}

type InputMode = "skip" | "manual" | "read" | null;

export function NewPrompt({ config, onBack, onError }: Props) {
  const [step, setStep] = useState(1);
  const [task, setTask] = useState("");
  const [formats, setFormats] = useState<Format[]>([]);
  const [format, setFormat] = useState<Format | null>(null);
  
  const [techniquesList, setTechniquesList] = useState<Technique[]>([]);
  const [selectedTechs, setSelectedTechs] = useState<Technique[]>([]);
  const [techIndex, setTechIndex] = useState(0);
  
  // Patterns state
  const [patternsMode, setPatternsMode] = useState<InputMode>(null);
  const [patternsPath, setPatternsPath] = useState(process.cwd());
  const [patternsText, setPatternsText] = useState("");
  const [isProcessingPatterns, setIsProcessingPatterns] = useState(false);
  const [patternsFiles, setPatternsFiles] = useState<string[]>([]);
  
  // Context state
  const [contextMode, setContextMode] = useState<InputMode>(null);
  const [contextPath, setContextPath] = useState(process.cwd());
  const [contextText, setContextText] = useState("");
  const [isProcessingContext, setIsProcessingContext] = useState(false);
  const [contextFiles, setContextFiles] = useState<string[]>([]);
  
  const [instruction, setInstruction] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  // Generation & Preview
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
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
    if (key.name === "escape") {
      // Allow escape from preview too
      onBack();
    }

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
    
    // Patterns Enter reading mode
    if (step === 4 && patternsMode === "read" && patternsFiles.length > 0 && !isProcessingPatterns) {
      if (key.name === "return") processPatternsWithAI();
    }

    // Context Enter reading mode
    if (step === 5 && contextMode === "read" && contextFiles.length > 0 && !isProcessingContext) {
      if (key.name === "return") processContextWithAI();
    }

    if (step === 6 && key.ctrl && key.name === "e") {
      handleEnhance();
    }
    
    // Preview step
    if (step === 7) {
      if (key.name === "return") handleSave();
      if (key.name === "r") handleGenerate(instruction);
    }

    if (step === 8 && key.name === "return") onBack();
  });

  const handleEnhance = async () => {
    setIsEnhancing(true);
    const res = await OpenRouterService.enhanceInstruction(instruction);
    if (res.ok) setInstruction(res.value);
    else onError(res.error.message);
    setIsEnhancing(false);
  };

  // ----- PATTERNS LOGIC -----
  const handlePatternsPathSubmit = async (val: string) => {
    setPatternsPath(val);
    const res = await ContextService.readProjectFiles(val);
    if (res.ok) {
      setPatternsFiles(res.value);
    } else {
      onError(res.error.message);
    }
  };

  const processPatternsWithAI = async () => {
    setIsProcessingPatterns(true);
    const contentRes = await ContextService.getContextString(patternsFiles);
    if (!contentRes.ok) {
      onError(contentRes.error.message);
      setIsProcessingPatterns(false);
      return;
    }

    const prompt = `Analise a estrutura e o codigo do projeto abaixo. Identifique a stack de tecnologias, padroes de arquitetura usados, detecte inconsistencias e gere um documento que recomende os padroes e boas praticas adotados no projeto. Seja conciso.\n\n${contentRes.value}`;
    const iaRes = await OpenRouterService.generate(prompt);
    
    if (iaRes.ok) {
      setPatternsText(iaRes.value);
      setStep(5);
    } else {
      onError(iaRes.error.message);
    }
    setIsProcessingPatterns(false);
  };

  // ----- CONTEXT LOGIC -----
  const handleContextPathSubmit = async (val: string) => {
    setContextPath(val);
    const res = await ContextService.readProjectFiles(val);
    if (res.ok) {
      setContextFiles(res.value);
    } else {
      onError(res.error.message);
    }
  };

  const processContextWithAI = async () => {
    setIsProcessingContext(true);
    const contentRes = await ContextService.getContextString(contextFiles);
    if (!contentRes.ok) {
      onError(contentRes.error.message);
      setIsProcessingContext(false);
      return;
    }

    const prompt = `Analise os seguintes arquivos do projeto e gere um resumo de contexto util para outras interacoes com IA. Explique a estrutura, stack principal e proposito.\n\n${contentRes.value}`;
    const iaRes = await OpenRouterService.generate(prompt);
    
    if (iaRes.ok) {
      setContextText(iaRes.value);
      setStep(6);
    } else {
      onError(iaRes.error.message);
    }
    setIsProcessingContext(false);
  };

  // ----- GENERATE & SAVE -----
  const handleGenerate = async (finalInstruction: string) => {
    setInstruction(finalInstruction);
    setIsGenerating(true);
    
    const finalPatterns = patternsMode !== "skip" ? patternsText : undefined;
    const finalContext = contextMode !== "skip" ? contextText : undefined;

    const res = await PromptBuilder.build(
      task,
      finalInstruction,
      format || formats[0],
      selectedTechs,
      finalPatterns,
      finalContext
    );
    
    if (res.ok) {
      setGeneratedPrompt(res.value);
      setStep(7); // Go to preview
    } else {
      onError(res.error.message);
    }
    setIsGenerating(false);
  };

  const handleSave = async () => {
    setIsGenerating(true);
    const res = await PromptBuilder.save(
      generatedPrompt,
      task,
      format || formats[0],
      config.outputDir
    );

    if (res.ok) {
      setResultPath(res.value);
      setStep(8);
    } else {
      onError(res.error.message);
    }
    setIsGenerating(false);
  };

  const stepLabels = ["Tarefa", "Formato", "Tecnicas", "Padroes", "Contexto", "Instrucao", "Preview", "Concluido"];
  const modeOptions = [
    { name: "⏭️ Pular", value: "skip", description: "Não adicionar esta seção" },
    { name: "📝 Informar manualmente", value: "manual", description: "Digitar ou colar texto livre" },
    { name: "📂 Ler do projeto", value: "read", description: "A IA analisa arquivos locais" }
  ];

  return (
    <ScreenContainer title="Criar Novo Prompt" showStep={{ current: step, total: 8 }}>
      <StepIndicator current={step} total={8} labels={stepLabels} />

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

      {step === 4 && (
        <box flexDirection="column" gap={1}>
          <text>
            <span style={{ fg: "cyan" }}>Como deseja definir os PADRÕES do projeto?</span>
          </text>
          
          {!patternsMode && (
            <MenuSelect
              options={modeOptions}
              onSelect={(item: any) => {
                setPatternsMode(item?.value as InputMode);
                if (item?.value === "skip") setStep(5);
              }}
            />
          )}

          {patternsMode === "manual" && (
             <box flexDirection="column" gap={1}>
               <text>
                 <span style={{ fg: "gray" }}>Digite ou cole os padrões (Enter para concluir):</span>
               </text>
               <input value={patternsText} focused onInput={setPatternsText} onSubmit={() => setStep(5)} />
             </box>
          )}

          {patternsMode === "read" && !isProcessingPatterns && (
             <box flexDirection="column" gap={1}>
               {patternsFiles.length === 0 ? (
                 <>
                  <text>
                    <span style={{ fg: "yellow" }}>Caminho do projeto para buscar Padrões:</span>
                  </text>
                  <input value={patternsPath} focused onInput={setPatternsPath} onSubmit={(v: any) => handlePatternsPathSubmit(v)} />
                 </>
               ) : (
                 <>
                  <text>
                    <span style={{ fg: "green" }}>Encontrados {patternsFiles.length} arquivos.</span>
                  </text>
                  <text>
                    <span style={{ fg: "gray" }}>Pressione Enter para usar a IA no mapeamento.</span>
                  </text>
                 </>
               )}
             </box>
          )}

          {isProcessingPatterns && <LoadingBox message="Lendo arquivos e gerando Padrões..." />}
        </box>
      )}

      {step === 5 && (
        <box flexDirection="column" gap={1}>
          <text>
            <span style={{ fg: "cyan" }}>Como deseja definir o CONTEXTO do projeto?</span>
          </text>
          
          {!contextMode && (
            <MenuSelect
              options={modeOptions}
              onSelect={(item: any) => {
                setContextMode(item?.value as InputMode);
                if (item?.value === "skip") setStep(6);
              }}
            />
          )}

          {contextMode === "manual" && (
             <box flexDirection="column" gap={1}>
               <text>
                 <span style={{ fg: "gray" }}>Digite ou cole o contexto (Enter para concluir):</span>
               </text>
               <input value={contextText} focused onInput={setContextText} onSubmit={() => setStep(6)} />
             </box>
          )}

          {contextMode === "read" && !isProcessingContext && (
             <box flexDirection="column" gap={1}>
               {contextFiles.length === 0 ? (
                 <>
                  <text>
                    <span style={{ fg: "yellow" }}>Caminho do projeto para buscar Contexto:</span>
                  </text>
                  <input value={contextPath} focused onInput={setContextPath} onSubmit={(v: any) => handleContextPathSubmit(v)} />
                 </>
               ) : (
                 <>
                  <text>
                    <span style={{ fg: "green" }}>Encontrados {contextFiles.length} arquivos.</span>
                  </text>
                  <text>
                    <span style={{ fg: "gray" }}>Pressione Enter para usar a IA no mapeamento.</span>
                  </text>
                 </>
               )}
             </box>
          )}

          {isProcessingContext && <LoadingBox message="Lendo arquivos e gerando Contexto..." />}
        </box>
      )}

      {step === 6 && !isGenerating && (
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

      {step === 6 && isGenerating && <LoadingBox message="Gerando prompt..." />}

      {step === 7 && !isGenerating && (
        <box flexDirection="column" gap={1} height="100%">
          <text>
            <span style={{ fg: "cyan" }}>Pré-visualização do prompt gerado:</span>
          </text>
          <box 
            borderStyle="rounded" 
            borderColor="gray" 
            paddingX={1} 
            flexGrow={1} 
            height={10} 
            overflow="hidden"
          >
            <text>{generatedPrompt.substring(0, 1000) + (generatedPrompt.length > 1000 ? "\n... (cortado para visualizacao) ..." : "")}</text>
          </box>
          <box flexDirection="row" gap={2}>
            <text><span style={{ fg: "green" }}>[ENTER]</span> <span style={{ fg: "gray" }}>Aprovar e Salvar</span></text>
            <text><span style={{ fg: "yellow" }}>[R]</span> <span style={{ fg: "gray" }}>Regenerar</span></text>
            <text><span style={{ fg: "red" }}>[ESC]</span> <span style={{ fg: "gray" }}>Cancelar</span></text>
          </box>
        </box>
      )}

      {step === 7 && isGenerating && <LoadingBox message="Salvando prompt gerado..." />}

      {step === 8 && (
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
