import { useState, useEffect } from "react";
import { MainMenu } from "./screens/MainMenu";
import { NewPrompt } from "./screens/NewPrompt";
import { ViewPrompts } from "./screens/ViewPrompts";
import { Settings } from "./screens/Settings";
import { GenerateContext } from "./screens/GenerateContext";
import { ProjectPattern } from "./screens/ProjectPattern";
import { ConfigService } from "./services/ConfigService";
import { AppConfig } from "./types";
import { homedir } from "os";
import { join } from "path";

type Screen = "MainMenu" | "NewPrompt" | "ViewPrompts" | "GenerateContext" | "ProjectPattern" | "Settings";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("MainMenu");
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadConfig() {
      const result = await ConfigService.load();
      if (!result.ok) {
        setConfig({
          apiKey: "",
          outputDir: join(homedir(), "replication-prompts"),
          model: "gemini-1.5-pro",
        });
      } else {
        setConfig(result.value);
      }
    }
    loadConfig();
  }, []);

  if (!config) {
    return <text>Carregando configurações...</text>;
  }

  const navigate = (screen: any) => {
    setCurrentScreen(screen);
    setError(null);
  };

  return (
    <box flexDirection="column" alignItems="center" justifyContent="center" padding={1} style={{ flexGrow: 1, width: "100%", height: "100%" }}>
      {error && <text><span fg="red">Erro: {error}</span></text>}
      {currentScreen === "MainMenu" && <MainMenu onNavigate={navigate} />}
      {currentScreen === "NewPrompt" && <NewPrompt config={config} onBack={() => navigate("MainMenu")} onError={setError} />}
      {currentScreen === "ViewPrompts" && <ViewPrompts config={config} onBack={() => navigate("MainMenu")} onError={setError} />}
      {currentScreen === "Settings" && <Settings config={config} onBack={() => navigate("MainMenu")} onError={setError} />}
      {currentScreen === "GenerateContext" && <GenerateContext config={config} onBack={() => navigate("MainMenu")} onError={setError} />}
      {currentScreen === "ProjectPattern" && <ProjectPattern config={config} onBack={() => navigate("MainMenu")} onError={setError} />}
    </box>
  );
}