import { useState } from "react";
import { AppConfig } from "../types";
import { ConfigService } from "../services/ConfigService";
import { useKeyboard } from "@opentui/react";

interface Props {
  config: AppConfig;
  onBack: () => void;
  onError: (msg: string) => void;
}

export function Settings({ config, onBack, onError }: Props) {
  const [step, setStep] = useState(1);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [outputDir, setOutputDir] = useState(config.outputDir);
  const [model, setModel] = useState(config.model);
  const [saved, setSaved] = useState(false);

  useKeyboard((key) => {
    if (key.name === "escape") onBack();
    if (saved && key.name === "return") onBack();
  });

  const handleSave = async (selectedModel: string) => {
    setModel(selectedModel);
    const newConfig = { apiKey, outputDir, model: selectedModel };
    const res = await ConfigService.save(newConfig);
    if (res.ok) setSaved(true);
    else onError(res.error.message);
  };

  if (saved) {
    return (
      <box flexDirection="column">
        <text><span fg="green">Configuração salva com sucesso!</span></text>
        <text>Pressione Enter para voltar.</text>
      </box>
    );
  }

  return (
    <box flexDirection="column">
      <text><strong>Configurações (Esc para voltar)</strong></text>

      {step === 1 && (
        <box flexDirection="column">
          <text>GOOGLE_API_KEY: </text>
          <box style={{ height: 1 }}>
            <input value={apiKey} focused onInput={setApiKey} onSubmit={(val: any) => { setApiKey(val); setStep(2); }} />
          </box>
        </box>
      )}

      {step === 2 && (
        <box flexDirection="column">
          <text>Pasta de saída dos prompts: </text>
          <box style={{ height: 1 }}>
            <input value={outputDir} focused onInput={setOutputDir} onSubmit={(val: any) => { setOutputDir(val); setStep(3); }} />
          </box>
        </box>
      )}

      {step === 3 && (
        <box flexDirection="column">
          <text>Modelo de IA:</text>
          <box style={{ marginTop: 1, width: 40, border: true }}>
            <select
              key="settings-model"
              focused={true}
              style={{ height: 3 }}
              options={[
                { name: "gemini-2.0-flash", description: "", value: "gemini-2.0-flash" },
                { name: "gemini-1.5-pro", description: "", value: "gemini-1.5-pro" },
                { name: "gemini-1.5-flash", description: "", value: "gemini-1.5-flash" }
              ]}
              onSelect={(_, item) => { if (item) handleSave(item.value); }}
            />
          </box>
        </box>
      )}
    </box>
  );
}