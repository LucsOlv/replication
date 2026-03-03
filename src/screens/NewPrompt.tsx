import { useEffect, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { usePromptStore } from "../store/usePromptStore";
import { Technique } from "../types";
import { FileService } from "../services/FileService";
import { OpenRouterService } from "../services/OpenRouterService";
import { ContextService } from "../services/ContextService";
import { TemplateService } from "../services/TemplateService";
import { PromptBuilder } from "../services/PromptBuilder";
import { ScreenContainer } from "../components/ScreenContainer";
import { StepIndicator } from "../components/StepIndicator";
import { LoadingBox, SuccessBox, ErrorBox } from "../components/StatusBox";
import { MenuSelect, MultiSelect } from "../components/CustomSelect";
import { join } from "path";
import { useKeyboard } from "@opentui/react";

interface Props {
  onBack: () => void;
}

type InputMode = "skip" | "manual" | "read" | null;

export function NewPrompt({ onBack }: Props) {
  const { config, setError } = useAppStore();
  const promptStore = usePromptStore();

  // Local state to track if technique selection was confirmed
  const [techniquesConfirmed, setTechniquesConfirmed] = useState(false);

  const {
    step, setStep,
    task, setTask,
    formats, setFormats,
    techniquesList, setTechniquesList,
    selectedTechs, setSelectedTechs,
    patternsMode, setPatternsMode,
    patternsPath, setPatternsPath,
    patternsText, setPatternsText,
    isProcessingPatterns, setIsProcessingPatterns,
    patternsFiles, setPatternsFiles,
    contextMode, setContextMode,
    contextPath, setContextPath,
    contextText, setContextText,
    isProcessingContext, setIsProcessingContext,
    contextFiles, setContextFiles,
    instruction, setInstruction,
    isEnhancing, setIsEnhancing,
    templatePreview, setTemplatePreview,
    isGenerating, setIsGenerating,
    generatedPrompt, setGeneratedPrompt,
    resultPath, setResultPath,
    resetPrompt
  } = promptStore;

  // Load techniques at mount
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
      resetPrompt();
      setTechniquesConfirmed(false); // Reset on escape
      onBack();
    }

    // Patterns Enter in reading mode
    if (step === 2 && patternsMode === "read" && patternsFiles.length > 0 && !isProcessingPatterns) {
      if (key.name === "return") processPatternsWithAI();
    }

    // Context Enter in reading mode
    if (step === 2 && contextMode === "read" && contextFiles.length > 0 && !isProcessingContext) {
      if (key.name === "return") processContextWithAI();
    }

    // Enhance instruction with Ctrl+E
    if (step === 3 && key.ctrl && key.name === "e") {
      handleEnhance();
    }

    // Template Preview step - Enter to send to AI
    if (step === 4 && key.name === "return" && !isGenerating) {
      handleGenerate(instruction);
    }

    // Final Preview step - Enter to save, R to regenerate
    if (step === 5 && key.name === "return" && !isGenerating) {
      handleSave();
    }
    if (step === 5 && key.name === "r" && !isGenerating) {
      handleGenerate(instruction);
    }

    // Success step
    if (step === 6 && key.name === "return") {
      resetPrompt();
      setTechniquesConfirmed(false);
      onBack();
    }
  });

  const handleEnhance = async () => {
    setIsEnhancing(true);
    const res = await OpenRouterService.enhanceInstruction(instruction);
    if (res.ok) setInstruction(res.value);
    else setError(res.error.message);
    setIsEnhancing(false);
  };

  // Check if user selected context or patterns techniques (recalculated on every render)
  const hasContextTech = selectedTechs.some(t => t.id === "project_context");
  const hasPatternsTech = selectedTechs.some(t => t.id === "project_patterns");

  // ----- PATTERNS LOGIC -----
  const handlePatternsPathSubmit = async (val: string) => {
    setPatternsPath(val);
    const res = await ContextService.readProjectFiles(val);
    if (res.ok) {
      setPatternsFiles(res.value);
    } else {
      setError(res.error.message);
    }
  };

  const processPatternsWithAI = async () => {
    setIsProcessingPatterns(true);
    const contentRes = await ContextService.getContextString(patternsFiles);
    if (!contentRes.ok) {
      setError(contentRes.error.message);
      setIsProcessingPatterns(false);
      return;
    }

    const prompt = `Analise a estrutura e o codigo do projeto abaixo. Identifique a stack de tecnologias, padroes de arquitetura usados, detecte inconsistencias e gere um documento que recomende os padroes e boas praticas adotados no projeto. Seja conciso.\n\n${contentRes.value}`;
    const iaRes = await OpenRouterService.generate(prompt);
    
    if (iaRes.ok) {
      setPatternsText(iaRes.value);
      setPatternsMode(null); // Reset mode after processing
    } else {
      setError(iaRes.error.message);
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
      setError(res.error.message);
    }
  };

  const processContextWithAI = async () => {
    setIsProcessingContext(true);
    const contentRes = await ContextService.getContextString(contextFiles);
    if (!contentRes.ok) {
      setError(contentRes.error.message);
      setIsProcessingContext(false);
      return;
    }

    const prompt = `Analise os seguintes arquivos do projeto e gere um resumo de contexto util para outras interacoes com IA. Explique a estrutura, stack principal e proposito.\n\n${contentRes.value}`;
    const iaRes = await OpenRouterService.generate(prompt);
    
    if (iaRes.ok) {
      setContextText(iaRes.value);
      setContextMode(null); // Reset mode after processing
    } else {
      setError(iaRes.error.message);
    }
    setIsProcessingContext(false);
  };

  // ----- GENERATE TEMPLATE PREVIEW -----
  const handleGenerateTemplatePreview = async () => {
    const finalPatterns = hasPatternsTech && patternsText ? patternsText : undefined;
    const finalContext = hasContextTech && contextText ? contextText : undefined;

    const res = await TemplateService.buildFromTechniques(
      task,
      instruction,
      selectedTechs, // Include ALL selected techniques (including context/patterns)
      finalPatterns,
      finalContext
    );
    
    if (res.ok) {
      setTemplatePreview(res.value);
      setStep(4); // Go to template preview
    } else {
      setError(res.error.message);
    }
  };

  // ----- GENERATE FINAL PROMPT WITH AI -----
  const handleGenerate = async (finalInstruction: string) => {
    setInstruction(finalInstruction);
    setIsGenerating(true);
    
    const finalPatterns = hasPatternsTech && patternsText ? patternsText : undefined;
    const finalContext = hasContextTech && contextText ? contextText : undefined;

    const res = await PromptBuilder.build(
      task,
      finalInstruction,
      formats[0], // Always XML now
      selectedTechs, // Include ALL selected techniques (including context/patterns)
      finalPatterns,
      finalContext
    );
    
    if (res.ok) {
      setGeneratedPrompt(res.value);
      setStep(5); // Go to final preview
    } else {
      setError(res.error.message);
    }
    setIsGenerating(false);
  };

  const handleSave = async () => {
    setIsGenerating(true);
    if (!config) return;

    const res = await PromptBuilder.save(
      generatedPrompt,
      task,
      formats[0], // Always XML now
      config.outputDir
    );

    if (res.ok) {
      setResultPath(res.value);
      setStep(6); // Go to success
    } else {
      setError(res.error.message);
    }
    setIsGenerating(false);
  };

  const stepLabels = ["Tarefa", "Tecnicas", "Instrucao", "Template", "Preview", "Concluido"];
  const modeOptions = [
    { name: "⏭️ Pular", value: "skip", description: "Não adicionar esta seção" },
    { name: "📝 Informar manualmente", value: "manual", description: "Digitar ou colar texto livre" },
    { name: "📂 Ler do projeto", value: "read", description: "A IA analisa arquivos locais" }
  ];

  // Check if we need to show patterns or context input in step 2
  // Logic: 
  // 1. Show technique selection until user confirms with Enter
  // 2. After confirmation, if patterns selected but not filled -> show patterns input
  // 3. If patterns filled and context selected but not filled -> show context input  
  // 4. If all needed inputs are filled -> show continue button
  
  const needsPatternsInput = hasPatternsTech && !patternsText;
  const needsContextInput = hasContextTech && !contextText;
  
  const showTechniqueSelection = !techniquesConfirmed;
  const showPatternsInput = techniquesConfirmed && needsPatternsInput;
  const showContextInput = techniquesConfirmed && !needsPatternsInput && needsContextInput;
  const allInputsComplete = techniquesConfirmed && !needsPatternsInput && !needsContextInput && (hasPatternsTech || hasContextTech);

  return (
    <ScreenContainer title="Criar Novo Prompt (XML)" showStep={{ current: step, total: 6 }}>
      <StepIndicator current={step} total={6} labels={stepLabels} />

      {/* STEP 1: Task */}
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
              onChange={setTask}
              onSubmit={() => {
                setTechniquesConfirmed(false); // Reset when moving to step 2
                setStep(2);
              }}
            />
          </box>
        </box>
      )}

      {/* STEP 2: Techniques (with context/patterns input if selected) */}
      {step === 2 && (
        <box flexDirection="column" gap={1}>
          {showTechniqueSelection && (
            <>
              <text>
                <span style={{ fg: "cyan" }}>Selecione as tecnicas:</span>
              </text>
              <text>
                <span style={{ fg: "gray" }}>(Espaco para selecionar, Enter para confirmar)</span>
              </text>
              <box flexDirection="column" gap={0}>
                <MultiSelect
                  options={techniquesList.map(t => ({ 
                    name: t.name, 
                    description: t.description, 
                    value: t.id 
                  }))}
                  selectedValues={selectedTechs.map(t => t.id)}
                  onChange={(vals: string[]) => setSelectedTechs(techniquesList.filter(t => vals.includes(t.id)))}
                  onSubmit={() => {
                    // Mark techniques as confirmed
                    setTechniquesConfirmed(true);
                    
                    // Check at submit time if context or patterns were selected
                    const hasContext = selectedTechs.some(t => t.id === "project_context");
                    const hasPatterns = selectedTechs.some(t => t.id === "project_patterns");
                    
                    // If neither context nor patterns selected, go to next step immediately
                    if (!hasContext && !hasPatterns) {
                      setStep(3);
                    }
                    // Otherwise, component will re-render and show input options
                  }}
                />
              </box>
            </>
          )}

          {/* PATTERNS INPUT */}
          {showPatternsInput && (
            <box flexDirection="column" gap={1}>
              <text>
                <span style={{ fg: "yellow" }}>Como deseja definir os PADRÕES do projeto?</span>
              </text>
              
              {!patternsMode && (
                <MenuSelect
                  options={modeOptions}
                  onSelect={(item: any) => {
                    setPatternsMode(item?.value as InputMode);
                    if (item?.value === "skip") {
                      setPatternsText("(Nenhum padrão fornecido)");
                    }
                  }}
                />
              )}

              {patternsMode === "manual" && (
                 <box flexDirection="column" gap={1}>
                   <text>
                     <span style={{ fg: "gray" }}>Digite ou cole os padrões (Enter para concluir):</span>
                   </text>
                   <input 
                     value={patternsText} 
                     focused 
                     onChange={setPatternsText} 
                     onSubmit={() => setPatternsMode(null)} 
                   />
                 </box>
              )}

              {patternsMode === "read" && !isProcessingPatterns && (
                 <box flexDirection="column" gap={1}>
                   {patternsFiles.length === 0 ? (
                     <>
                      <text>
                        <span style={{ fg: "yellow" }}>Caminho do projeto para buscar Padrões:</span>
                      </text>
                      <input 
                        value={patternsPath} 
                        focused 
                        onChange={setPatternsPath} 
                        onSubmit={() => handlePatternsPathSubmit(patternsPath)} 
                      />
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

          {/* CONTEXT INPUT */}
          {!showPatternsInput && showContextInput && (
            <box flexDirection="column" gap={1}>
              <text>
                <span style={{ fg: "yellow" }}>Como deseja definir o CONTEXTO do projeto?</span>
              </text>
              
              {!contextMode && (
                <MenuSelect
                  options={modeOptions}
                  onSelect={(item: any) => {
                    setContextMode(item?.value as InputMode);
                    if (item?.value === "skip") {
                      setContextText("(Nenhum contexto fornecido)");
                    }
                  }}
                />
              )}

              {contextMode === "manual" && (
                 <box flexDirection="column" gap={1}>
                   <text>
                     <span style={{ fg: "gray" }}>Digite ou cole o contexto (Enter para concluir):</span>
                   </text>
                   <input 
                     value={contextText} 
                     focused 
                     onChange={setContextText} 
                     onSubmit={() => {
                       setContextMode(null);
                       setStep(3); // Move to next step after context
                     }} 
                   />
                 </box>
              )}

              {contextMode === "read" && !isProcessingContext && (
                 <box flexDirection="column" gap={1}>
                   {contextFiles.length === 0 ? (
                     <>
                      <text>
                        <span style={{ fg: "yellow" }}>Caminho do projeto para buscar Contexto:</span>
                      </text>
                      <input 
                        value={contextPath} 
                        focused 
                        onChange={setContextPath} 
                        onSubmit={() => handleContextPathSubmit(contextPath)} 
                      />
                     </>
                   ) : (
                     <>
                      <text>
                        <span style={{ fg: "green" }}>Encontrados {contextFiles.length} arquivos.</span>
                      </text>
                      <text>
                        <span style={{ fg: "gray" }}>Pressione Enter para usar a IA no mapeamento.</span>
                      </text>
                      <text>
                        <span style={{ fg: "gray" }}>Após isso, avance para o próximo passo.</span>
                      </text>
                     </>
                   )}
                 </box>
              )}

              {isProcessingContext && <LoadingBox message="Lendo arquivos e gerando Contexto..." />}

              {contextText && !isProcessingContext && (
                <box flexDirection="column" gap={1}>
                  <text>
                    <span style={{ fg: "green" }}>Contexto definido! Pressione Enter para continuar.</span>
                  </text>
                  <input 
                    value="" 
                    focused 
                    onSubmit={() => setStep(3)} 
                  />
                </box>
              )}
            </box>
          )}

          {/* Show continue button when all needed inputs are complete */}
          {allInputsComplete && (
            <box flexDirection="column" gap={1}>
              <text>
                <span style={{ fg: "green" }}>Técnicas configuradas! Pressione Enter para continuar.</span>
              </text>
              <input 
                value="" 
                focused 
                onSubmit={() => setStep(3)} 
              />
            </box>
          )}
        </box>
      )}

      {/* STEP 3: Instruction */}
      {step === 3 && (
        <box flexDirection="column" gap={1}>
          <text>
            <span style={{ fg: "cyan" }}>Escreva a instrucao principal do prompt:</span>
          </text>
          <box style={{ height: 1 }}>
            <input 
              value={instruction} 
              focused 
              onChange={setInstruction} 
              onSubmit={() => handleGenerateTemplatePreview()} 
            />
          </box>
          <text>
            <span style={{ fg: "gray" }}>Ctrl+E para </span>
            <span style={{ fg: "yellow" }}>Melhorar instrucao com IA</span>
          </text>
          {isEnhancing && <LoadingBox message="Melhorando instrucao..." />}
        </box>
      )}

      {/* STEP 4: Template Preview (before AI) */}
      {step === 4 && !isGenerating && (
        <box flexDirection="column" gap={1}>
          <text>
            <span style={{ fg: "cyan" }}>Preview do Template XML (antes da IA preencher):</span>
          </text>
          <text>
            <span style={{ fg: "gray" }}>Revise o template. Pressione Enter para enviar para IA preencher.</span>
          </text>
          <scrollbox
            focused
            style={{
              scrollbarOptions: {
                showArrows: true,
                trackOptions: {
                  foregroundColor: "#58a6ff",
                  backgroundColor: "#2d333b",
                },
              },
            }}
            height={15}
            padding={1}
            border
            borderStyle="rounded"
            borderColor="#58a6ff"
          >
            {templatePreview.split("\n").map((line, i) => (
              <text key={i}>
                <span style={{ fg: line.trim().startsWith("<!--") ? "gray" : "cyan" }}>
                  {line || " "}
                </span>
              </text>
            ))}
          </scrollbox>
          <box flexDirection="row" gap={2}>
            <text><span style={{ fg: "green" }}>[ENTER]</span> <span style={{ fg: "gray" }}>Enviar para IA preencher</span></text>
            <text><span style={{ fg: "red" }}>[ESC]</span> <span style={{ fg: "gray" }}>Cancelar</span></text>
          </box>
        </box>
      )}

      {step === 4 && isGenerating && <LoadingBox message="Enviando template para IA preencher..." />}

      {/* STEP 5: Final Preview (after AI) */}
      {step === 5 && !isGenerating && (
        <box flexDirection="column" gap={1}>
          <text>
            <span style={{ fg: "cyan" }}>Preview do Prompt XML Final (preenchido pela IA):</span>
          </text>
          <scrollbox
            focused
            style={{
              scrollbarOptions: {
                showArrows: true,
                trackOptions: {
                  foregroundColor: "#58a6ff",
                  backgroundColor: "#2d333b",
                },
              },
            }}
            height={15}
            padding={1}
            border
            borderStyle="rounded"
            borderColor="green"
          >
            {generatedPrompt.split("\n").map((line, i) => (
              <text key={i}>
                <span style={{ fg: "white" }}>{line || " "}</span>
              </text>
            ))}
          </scrollbox>
          <box flexDirection="row" gap={2}>
            <text><span style={{ fg: "green" }}>[ENTER]</span> <span style={{ fg: "gray" }}>Aprovar e Salvar</span></text>
            <text><span style={{ fg: "yellow" }}>[R]</span> <span style={{ fg: "gray" }}>Regenerar</span></text>
            <text><span style={{ fg: "red" }}>[ESC]</span> <span style={{ fg: "gray" }}>Cancelar</span></text>
          </box>
        </box>
      )}

      {step === 5 && isGenerating && <LoadingBox message="Gerando prompt com IA..." />}

      {/* STEP 6: Success */}
      {step === 6 && (
        <SuccessBox message="Prompt XML salvo com sucesso!">
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
