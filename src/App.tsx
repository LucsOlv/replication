import { useEffect, useState } from "react";
import { useAppStore } from "./store/useAppStore";
import { MainMenu } from "./screens/MainMenu";
import { NewPrompt } from "./screens/NewPrompt";
import { ViewPrompts } from "./screens/ViewPrompts";
import { ViewLogs } from "./screens/ViewLogs";
import { Settings } from "./screens/Settings";
import { GenerateContext } from "./screens/GenerateContext";
import { ProjectPattern } from "./screens/ProjectPattern";
import { Layout } from "./components/Layout";
import { ErrorBox } from "./components/StatusBox";
import { FileService } from "./services/FileService";
import { join } from "path";

type Screen = "MainMenu" | "NewPrompt" | "ViewPrompts" | "ViewLogs" | "GenerateContext" | "ProjectPattern" | "Settings";

export default function App() {
  const { config, currentScreen, error, setCurrentScreen, loadInitialConfig } = useAppStore();
  const [screensConfig, setScreensConfig] = useState<Record<string, {title: string, help: string[]}>>({});

  useEffect(() => {
    async function init() {
      await loadInitialConfig();

      const screensResult = await FileService.readFile(join(process.cwd(), "config", "screens.json"));
      if (screensResult.ok) {
        try {
          const data = JSON.parse(screensResult.value);
          setScreensConfig(data.screens || {});
        } catch {}
      }
    }
    init();
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
    setCurrentScreen(screen as any);
  };

  const renderScreen = () => {
    if (error) {
      return <ErrorBox message={error} />;
    }

    switch (currentScreen) {
      case "MainMenu":
        return <MainMenu onNavigate={navigate} />;
      case "NewPrompt":
        return <NewPrompt onBack={() => navigate("MainMenu")} />;
      case "ViewPrompts":
        return <ViewPrompts onBack={() => navigate("MainMenu")} />;
      case "ViewLogs":
        return <ViewLogs onBack={() => navigate("MainMenu")} />;
      case "Settings":
        return <Settings onBack={() => navigate("MainMenu")} />;
      case "GenerateContext":
        return <GenerateContext onBack={() => navigate("MainMenu")} />;
      case "ProjectPattern":
        return <ProjectPattern onBack={() => navigate("MainMenu")} />;
      default:
        return <MainMenu onNavigate={navigate} />;
    }
  };

  const screenConf = screensConfig[currentScreen] || { title: currentScreen, help: [] };

  return (
    <Layout title={screenConf.title} help={screenConf.help}>
      {renderScreen()}
    </Layout>
  );
}
