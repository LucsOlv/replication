import { useState, useEffect } from "react";
import { join } from "path";
import { AppConfig } from "../types";
import { FileService } from "../services/FileService";
import { ScreenContainer } from "../components/ScreenContainer";
import { InfoBox } from "../components/StatusBox";
import { MinimalSelect } from "../components/CustomSelect";
import { useKeyboard } from "@opentui/react";
import { useAppStore } from "../store/useAppStore";

interface Props {
  onBack: () => void;
}

export function ViewLogs({ onBack }: Props) {
  const { setError } = useAppStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<string | null>(null);

  const LOGS_DIR = join(process.cwd(), ".logs");

  useEffect(() => {
    async function load() {
      const res = await FileService.readDir(LOGS_DIR);
      if (res.ok) {
        setLogs(res.value);
      } else {
        // Se a pasta não existir ou der erro, fica vazio
        setLogs([]);
      }
      setLoading(false);
    }
    load();
  }, [setError]);

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
      <ScreenContainer title="Logs do Sistema">
        <text>
          <span style={{ fg: "yellow" }}>Carregando logs...</span>
        </text>
      </ScreenContainer>
    );
  }

  if (selectedContent) {
    let formattedContent = selectedContent;
    try {
      // Tentar formatar o JSON
      const parsed = JSON.parse(selectedContent);
      formattedContent = JSON.stringify(parsed, null, 2);
    } catch (e) {
      // Usar texto puro se falhar
    }

    const lines = formattedContent.split("\n");

    return (
      <ScreenContainer title="Conteúdo do Log">
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

  const items = logs.map((p) => ({
    name: p.name,
    description: `${Math.round(p.size / 1024)}kb - ${p.createdAt.toLocaleDateString()} ${p.createdAt.toLocaleTimeString()}`,
    value: p.path,
  }));
  items.push({ name: "Voltar", description: "Retornar ao menu", value: "back" });

  return (
    <ScreenContainer title="Logs do Sistema">
      {logs.length === 0 ? (
        <box flexDirection="column" gap={1}>
          <text>
            <span style={{ fg: "yellow" }}>Nenhum log encontrado.</span>
          </text>
          <text>
            <span style={{ fg: "gray" }}>Os logs serao salvos na pasta .logs</span>
          </text>
          <MinimalSelect options={[{ name: "Voltar", description: "Retornar ao menu", value: "back" }]} onSelect={handleSelect} />
        </box>
      ) : (
        <MinimalSelect options={items} onSelect={handleSelect} />
      )}
    </ScreenContainer>
  );
}
