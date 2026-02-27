import { create } from "zustand";
import { Format, Technique } from "../types";

type InputMode = "skip" | "manual" | "read" | null;

interface PromptState {
    step: number;
    task: string;
    formats: Format[];
    format: Format | null;

    techniquesList: Technique[];
    selectedTechs: Technique[];

    patternsMode: InputMode;
    patternsPath: string;
    patternsText: string;
    isProcessingPatterns: boolean;
    patternsFiles: string[];

    contextMode: InputMode;
    contextPath: string;
    contextText: string;
    isProcessingContext: boolean;
    contextFiles: string[];

    instruction: string;
    isEnhancing: boolean;

    isGenerating: boolean;
    generatedPrompt: string;
    resultPath: string;

    setStep: (step: number) => void;
    setTask: (task: string) => void;
    setFormats: (formats: Format[]) => void;
    setFormat: (format: Format) => void;
    setTechniquesList: (list: Technique[]) => void;
    setSelectedTechs: (techs: Technique[]) => void;

    setPatternsMode: (mode: InputMode) => void;
    setPatternsPath: (path: string) => void;
    setPatternsText: (text: string) => void;
    setIsProcessingPatterns: (processing: boolean) => void;
    setPatternsFiles: (files: string[]) => void;

    setContextMode: (mode: InputMode) => void;
    setContextPath: (path: string) => void;
    setContextText: (text: string) => void;
    setIsProcessingContext: (processing: boolean) => void;
    setContextFiles: (files: string[]) => void;

    setInstruction: (instruction: string) => void;
    setIsEnhancing: (enhancing: boolean) => void;

    setIsGenerating: (generating: boolean) => void;
    setGeneratedPrompt: (prompt: string) => void;
    setResultPath: (path: string) => void;

    resetPrompt: () => void;
}

const initialState = {
    step: 1,
    task: "",
    formats: [],
    format: null,
    techniquesList: [],
    selectedTechs: [],
    patternsMode: null as InputMode,
    patternsPath: process.cwd(),
    patternsText: "",
    isProcessingPatterns: false,
    patternsFiles: [],
    contextMode: null as InputMode,
    contextPath: process.cwd(),
    contextText: "",
    isProcessingContext: false,
    contextFiles: [],
    instruction: "",
    isEnhancing: false,
    isGenerating: false,
    generatedPrompt: "",
    resultPath: "",
};

export const usePromptStore = create<PromptState>((set) => ({
    ...initialState,

    setStep: (step) => set({ step }),
    setTask: (task) => set({ task }),
    setFormats: (formats) => set({ formats }),
    setFormat: (format) => set({ format }),
    setTechniquesList: (techniquesList) => set({ techniquesList }),
    setSelectedTechs: (selectedTechs) => set({ selectedTechs }),

    setPatternsMode: (patternsMode) => set({ patternsMode }),
    setPatternsPath: (patternsPath) => set({ patternsPath }),
    setPatternsText: (patternsText) => set({ patternsText }),
    setIsProcessingPatterns: (isProcessingPatterns) => set({ isProcessingPatterns }),
    setPatternsFiles: (patternsFiles) => set({ patternsFiles }),

    setContextMode: (contextMode) => set({ contextMode }),
    setContextPath: (contextPath) => set({ contextPath }),
    setContextText: (contextText) => set({ contextText }),
    setIsProcessingContext: (isProcessingContext) => set({ isProcessingContext }),
    setContextFiles: (contextFiles) => set({ contextFiles }),

    setInstruction: (instruction) => set({ instruction }),
    setIsEnhancing: (isEnhancing) => set({ isEnhancing }),

    setIsGenerating: (isGenerating) => set({ isGenerating }),
    setGeneratedPrompt: (generatedPrompt) => set({ generatedPrompt }),
    setResultPath: (resultPath) => set({ resultPath }),

    resetPrompt: () => set({ ...initialState, formats: usePromptStore.getState().formats, techniquesList: usePromptStore.getState().techniquesList }),
}));
