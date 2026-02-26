import { useState, useEffect } from "react";
import { AppConfig, SavedPrompt } from "../types";
import { FileService } from "../services/FileService";
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
  }, [config.outputDir]);

  useKeyboard((key) => {
    if (key.name === "escape") {
      if (selectedContent) setSelectedContent(null);
      else onBack();
    }
    if (key.name === "return" && selectedContent) {
      setSelectedContent(null);
    }
  });

  const handleSelect = async (index: number, item: any) => {
    if (!item) return;
    if (item.value === "back") {
      onBack();
      return;
    }
    const res = await FileService.readFile(item.value);
    if (res.ok) setSelectedContent(res.value);
    else onError(res.error.message);
  };

  if (loading) return <text>Carregando...</text>;

  if (selectedContent) {
    return (
      <box flexDirection="column">
        <text>{selectedContent.slice(0, 1000)} {selectedContent.length > 1000 ? "\n... (truncado)" : ""}</text>
        <box style={{ marginTop: 1 }}><text><span fg="gray">Pressione Enter ou Esc para voltar à lista.</span></text></box>     
      </box>
    );
  }

  const items = prompts.map(p => ({
    name: `${p.name} (${Math.round(p.size / 1024)}kb) - ${p.createdAt.toLocaleDateString()}`,
    description: "",
    value: p.path
  }));
  items.push({ name: "Voltar", description: "", value: "back" });

  return (
    <box flexDirection="column">
      <text><strong>Prompts Salvos em {config.outputDir}:</strong></text>
      {prompts.length === 0 ? <text>Nenhum prompt encontrado.</text> : null}
      <box style={{ marginTop: 1, width: 80, border: true }}>
        <select focused={true} style={{ height: items.length }} key={`prompts-${items.length}`} options={items} onSelect={handleSelect} />
      </box>
    </box>
  );
}