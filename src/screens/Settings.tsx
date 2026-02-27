import { useState } from "react";
import { AppConfig } from "../types";
import { ConfigService } from "../services/ConfigService";
import { ScreenContainer } from "../components/ScreenContainer";
import { StepIndicator } from "../components/StepIndicator";
import { SuccessBox } from "../components/StatusBox";
import { MenuSelect } from "../components/CustomSelect";
import { useKeyboard } from "@opentui/react";

import { useAppStore } from "../store/useAppStore";

interface Props {
  onBack: () => void;
}

export function Settings({ onBack }: Props) {
  const { config, setError } = useAppStore();
  const [step, setStep] = useState(1);
  const [apiKey, setApiKey] = useState(config?.apiKey || "");
  const [outputDir, setOutputDir] = useState(config?.outputDir || "");
  const [model, setModel] = useState(config?.model || "");
  const [saved, setSaved] = useState(false);

  useKeyboard((key) => {
    if (key.name === "escape") onBack();
    if (saved && key.name === "return") onBack();
  });

  const handleSave = async (selectedModel: string) => {
    setModel(selectedModel);
    const newConfig = { apiKey, outputDir, model: selectedModel };
    const res = await ConfigService.save(newConfig);
    if (res.ok) {
      useAppStore.getState().loadInitialConfig();
      setSaved(true);
    }
    else setError(res.error.message);
  };

  const stepLabels = ["API Key", "Pasta", "Modelo"];

  if (saved) {
    return (
      <ScreenContainer title="Configuracoes">
        <SuccessBox message="Configuracao salva com sucesso!">
          <text>
            <span style={{ fg: "gray" }}>Pressione Enter para voltar.</span>
          </text>
        </SuccessBox>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title="Configuracoes" showStep={{ current: step, total: 3 }}>
      <StepIndicator current={step} total={3} labels={stepLabels} />

      {step === 1 && (
        <box flexDirection="column" gap={1}>
          <text>
            <span style={{ fg: "cyan" }}>OPENROUTER_API_KEY:</span>
          </text>
          <box style={{ height: 1 }}>
            <input
              value={apiKey}
              focused
              onInput={setApiKey}
              onSubmit={(val: any) => {
                setApiKey(val);
                setStep(2);
              }}
            />
          </box>
        </box>
      )}

      {step === 2 && (
        <box flexDirection="column" gap={1}>
          <text>
            <span style={{ fg: "cyan" }}>Pasta de saida dos prompts:</span>
          </text>
          <box style={{ height: 1 }}>
            <input
              value={outputDir}
              focused
              onInput={setOutputDir}
              onSubmit={(val: any) => {
                setOutputDir(val);
                setStep(3);
              }}
            />
          </box>
        </box>
      )}

      {step === 3 && (
        <box flexDirection="column" gap={1}>
          <text>
            <span style={{ fg: "cyan" }}>Modelo de IA:</span>
          </text>
          <MenuSelect
            options={[
              { name: "google/gemini-2.5-flash", description: "Mais rapido (Gemini via OR)", value: "google/gemini-2.5-flash" },
              { name: "anthropic/claude-3.5-sonnet", description: "Mais capacidade (Claude via OR)", value: "anthropic/claude-3.5-sonnet" },
              { name: "openai/gpt-4o-mini", description: "Balanceado (GPT via OR)", value: "openai/gpt-4o-mini" },
            ]}
            onSelect={(item: any) => {
              if (item) handleSave(item.value);
            }}
          />
        </box>
      )}
    </ScreenContainer>
  );
}
