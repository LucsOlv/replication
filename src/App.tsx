import { useState, useEffect } from "react";
import { MainMenu } from "./screens/MainMenu";
import { NewPrompt } from "./screens/NewPrompt";
import { ViewPrompts } from "./screens/ViewPrompts";
import { Settings } from "./screens/Settings";
import { GenerateContext } from "./screens/GenerateContext";
import { ProjectPattern } from "./screens/ProjectPattern";
import { Layout } from "./components/Layout";
import { ErrorBox } from "./components/StatusBox";
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
          model: "google/gemini-2.5-flash",
        });
      } else {
        setConfig(result.value);
      }
    }
    loadConfig();
  }, []);

  if (!config) {
    return (
      <box flexDirection="column" alignItems="center" justifyContent="center" height="100%">
        <text>
          <span style={{ fg: "yellow" }}>Carregando configuracoes...</span>
        </text>
      </box>
    );
  }

  const navigate = (screen: string) => {
    setCurrentScreen(screen as Screen);
    setError(null);
  };

  const renderScreen = () => {
    if (error) {
      return <ErrorBox message={error} />;
    }

    switch (currentScreen) {
      case "MainMenu":
        return <MainMenu onNavigate={navigate} />;
      case "NewPrompt":
        return <NewPrompt config={config} onBack={() => navigate("MainMenu")} onError={setError} />;
      case "ViewPrompts":
        return <ViewPrompts config={config} onBack={() => navigate("MainMenu")} onError={setError} />;
      case "Settings":
        return <Settings config={config} onBack={() => navigate("MainMenu")} onError={setError} />;
      case "GenerateContext":
        return <GenerateContext config={config} onBack={() => navigate("MainMenu")} onError={setError} />;
      case "ProjectPattern":
        return <ProjectPattern config={config} onBack={() => navigate("MainMenu")} onError={setError} />;
      default:
        return <MainMenu onNavigate={navigate} />;
    }
  };

  return (
    <Layout currentScreen={currentScreen}>
      {renderScreen()}
    </Layout>
  );
}
