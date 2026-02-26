import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  currentScreen?: string;
}

const screenTitles: Record<string, string> = {
  MainMenu: "Menu Principal",
  NewPrompt: "Novo Prompt",
  ViewPrompts: "Prompts Salvos",
  Settings: "Configuracoes",
  GenerateContext: "Gerar Contexto",
  ProjectPattern: "Padrao de Projeto",
};

const screenHelp: Record<string, string[]> = {
  MainMenu: ["↑↓ Navegar", "Enter Selecionar"],
  NewPrompt: ["↑↓ Navegar", "Space Selecionar", "Enter Confirmar", "Ctrl+E IA", "Esc Voltar"],
  ViewPrompts: ["↑↓ Navegar", "Enter Abrir", "Esc Voltar"],
  Settings: ["Enter Avancar", "Esc Voltar"],
  GenerateContext: ["Enter Avancar", "Esc Voltar"],
  ProjectPattern: ["Enter Avancar", "Esc Voltar"],
};

export function Layout({ children, currentScreen = "MainMenu" }: Props) {
  const title = screenTitles[currentScreen] || currentScreen;
  const helps = screenHelp[currentScreen] || [];

  return (
    <box flexDirection="column" height="100%" width="100%" >
      <box
        height={6}
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        border
        borderColor="#00d9ff"
      >
        <ascii-font text="Replication" font="block" />
        <text>
          <span style={{ fg: "#58a6ff" }}>{title}</span>
        </text>
      </box>

      <box flexGrow={1} flexDirection="column" alignItems="center" justifyContent="center" padding={1}>
        {children}
      </box>

      <box
        height={2}
        flexDirection="row"
        justifyContent="center"
        alignItems="center"
        border
        borderColor="#2d333b"
        gap={3}
      >
        {helps.map((help, i) => {
          const parts = help.split(" ");
          return (
            <box key={i} flexDirection="row" gap={1}>
              <text>
                <span style={{ fg: "#58a6ff" }}>{parts[0]}</span>
              </text>
              <text>
                <span style={{ fg: "#484f58" }}>{parts.slice(1).join(" ")}</span>
              </text>
            </box>
          );
        })}
      </box>
    </box>
  );
}
