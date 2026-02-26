import { useState, useEffect } from "react";
import { AppConfig, SavedPrompt } from "../types";
import { FileService } from "../services/FileService";
import { ScreenContainer } from "../components/ScreenContainer";
import { InfoBox } from "../components/StatusBox";
import { MinimalSelect } from "../components/CustomSelect";
import { useKeyboard } from "@opentui/react";

interface Props {
  config: AppConfig;
  onBack: () => void;
  onError: (msg: string) => void;
}

export function ViewPrompts({ config, onBack, onError }: Props) {
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await FileService.readDir(config.outputDir);
      if (res.ok) setPrompts(res.value);
      else onError(res.error.message);
      setLoading(false);
    }
    load();
  }, [config.outputDir, onError]);

  const [scrollOffset, setScrollOffset] = useState(0);
  const CONTENT_LINES_VISIBLE = 20;

  useKeyboard((key) => {
    if (key.name === "escape") {
      if (selectedContent) {
        setSelectedContent(null);
        setScrollOffset(0);
      } else {
        onBack();
      }
    }
    if (key.name === "return" && selectedContent) {
      setSelectedContent(null);
      setScrollOffset(0);
    }
    if (selectedContent) {
      const totalLines = selectedContent.split("\n").length;
      if (key.name === "up") {
        setScrollOffset((prev) => Math.max(0, prev - 1));
      }
      if (key.name === "down") {
        setScrollOffset((prev) => Math.min(Math.max(0, totalLines - CONTENT_LINES_VISIBLE), prev + 1));
      }
      if (key.name === "pageup") {
         setScrollOffset((prev) => Math.max(0, prev - CONTENT_LINES_VISIBLE));
      }
      if (key.name === "pagedown") {
         setScrollOffset((prev) => Math.min(Math.max(0, totalLines - CONTENT_LINES_VISIBLE), prev + CONTENT_LINES_VISIBLE));
      }
    }
  });

  const handleSelect = async (item: any) => {
    if (item.value === "back") {
      onBack();
      return;
    }
    const res = await FileService.readFile(item.value);
    if (res.ok) setSelectedContent(res.value);
    else onError(res.error.message);
  };

  if (loading) {
    return (
      <ScreenContainer title="Prompts Salvos" width={50}>
        <text>
          <span style={{ fg: "yellow" }}>Carregando...</span>
        </text>
      </ScreenContainer>
    );
  }

  if (selectedContent) {
    const lines = selectedContent.split("\n");
    const visibleLines = lines.slice(scrollOffset, scrollOffset + CONTENT_LINES_VISIBLE).join("\n");
    const hasMoreDown = scrollOffset + CONTENT_LINES_VISIBLE < lines.length;
    const hasMoreUp = scrollOffset > 0;

    return (
      <ScreenContainer title="Conteúdo do Arquivo" width="80%">
        <box flexDirection="column" gap={0}>
          <text>
            <span style={{ fg: "magenta" }}>{hasMoreUp ? "... (Role para cima: SETA CIMA / PAGEUP) ..." : " "}</span>
          </text>
          <box height={CONTENT_LINES_VISIBLE}>
            <text>
              <span style={{ fg: "gray" }}>{visibleLines || " "}</span>
            </text>
          </box>
          <text>
            <span style={{ fg: "magenta" }}>{hasMoreDown ? "... (Role para baixo: SETA BAIXO / PAGEDOWN) ..." : " "}</span>
          </text>
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
    <ScreenContainer title={`Prompts em ${config.outputDir}`} width={80}>
      {prompts.length === 0 ? (
        <box flexDirection="column" gap={1}>
          <text>
            <span style={{ fg: "yellow" }}>Nenhum prompt encontrado.</span>
          </text>
          <text>
            <span style={{ fg: "gray" }}>Os prompts serao salvos em: {config.outputDir}</span>
          </text>
        </box>
      ) : (
        <MinimalSelect options={items} onSelect={handleSelect} />
      )}
    </ScreenContainer>
  );
}
