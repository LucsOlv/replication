import { create } from "zustand";
import { AppConfig } from "../types";
import { ConfigService } from "../services/ConfigService";
import { join } from "path";
import { homedir } from "os";

type Screen = "MainMenu" | "NewPrompt" | "ViewPrompts" | "ViewLogs" | "GenerateContext" | "ProjectPattern" | "Settings";

interface AppState {
    config: AppConfig | null;
    currentScreen: Screen;
    error: string | null;

    setConfig: (config: AppConfig) => void;
    setCurrentScreen: (screen: Screen) => void;
    setError: (error: string | null) => void;
    loadInitialConfig: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
    config: null,
    currentScreen: "MainMenu",
    error: null,

    setConfig: (config) => set({ config }),
    setCurrentScreen: (screen) => set({ currentScreen: screen, error: null }),
    setError: (error) => set({ error }),

    loadInitialConfig: async () => {
        const result = await ConfigService.load();
        if (!result.ok) {
            set({
                config: {
                    apiKey: "",
                    outputDir: join(homedir(), "replication-prompts"),
                    model: "google/gemini-2.5-flash",
                }
            });
        } else {
            set({ config: result.value });
        }
    }
}));
