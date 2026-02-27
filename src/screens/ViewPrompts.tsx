import { useState, useEffect } from "react";
import { AppConfig, SavedPrompt } from "../types";
import { FileService } from "../services/FileService";
import { ScreenContainer } from "../components/ScreenContainer";
import { InfoBox } from "../components/StatusBox";
import { MinimalSelect } from "../components/CustomSelect";
import { useKeyboard } from "@opentui/react";

import { useAppStore } from "../store/useAppStore";

interface Props {
  onBack: () => void;
}

export function ViewPrompts({ onBack }: Props) {
  const { config, setError } = useAppStore();
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!config) return;
      const res = await FileService.readDir(config.outputDir);
      if (res.ok) setPrompts(res.value);
      else setError(res.error.message);
      setLoading(false);
    }
    load();
  }, [config?.outputDir, setError]);

  useKeyboard((key) => {
    if (key.name === "escape") {
      if (selectedContent) {
        setSelectedContent(null);
      } else {
        onBack();
      }
    }
    if (key.name === "return" && selectedContent) {
      setSelectedContent(null);
    }
  });

  const handleSelect = async (item: any) => {
    if (item.value === "back") {
      onBack();
      return;
    }
    const res = await FileService.readFile(item.value);
    if (res.ok) setSelectedContent(res.value);
    else setError(res.error.message);
  };

  if (loading) {
    return (
      <ScreenContainer title="Prompts Salvos">
        <text>
          <span style={{ fg: "yellow" }}>Carregando...</span>
        </text>
      </ScreenContainer>
    );
  }

  if (selectedContent) {
    const lines = selectedContent.split("\n");

    return (
      <ScreenContainer title="Conteúdo do Arquivo">
        <box flexDirection="column" gap={1} height="100%">
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
            flexGrow={1}
            padding={1}
          >
            {lines.map((line, i) => (
              <text key={i}>
                <span style={{ fg: "gray" }}>{line || " "}</span>
              </text>
            ))}
          </scrollbox>
        </box>
        <InfoBox message="Pressione Enter ou Esc para voltar" />
      </ScreenContainer>
    );
  }

  const items = prompts.map((p) => ({
    name: p.name,
    description: `${Math.round(p.size / 1024)}kb - ${p.createdAt.toLocaleDateString()}`,
    value: p.path,
  }));
  items.push({ name: "Voltar", description: "Retornar ao menu", value: "back" });

  return (
    <ScreenContainer title={`Prompts em ${config?.outputDir}`}>
      {prompts.length === 0 ? (
        <box flexDirection="column" gap={1}>
          <text>
            <span style={{ fg: "yellow" }}>Nenhum prompt encontrado.</span>
          </text>
          <text>
            <span style={{ fg: "gray" }}>Os prompts serao salvos em: {config?.outputDir}</span>
          </text>
        </box>
      ) : (
        <MinimalSelect options={items} onSelect={handleSelect} />
      )}
    </ScreenContainer>
  );
}
