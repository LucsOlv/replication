import { useState, useEffect } from "react";
import { FileService } from "../services/FileService";
import { join } from "path";

interface Props {
  onNavigate: (screen: string) => void;
}

interface MenuOption {
  name: string;
  description: string;
  value: string;
}

export function MainMenu({ onNavigate }: Props) {
  const [menus, setMenus] = useState<MenuOption[]>([]);

  useEffect(() => {
    async function loadMenus() {
      const path = join(process.cwd(), "config", "menus.json");
      const result = await FileService.readFile(path);
      if (result.ok) {
        try {
          const data = JSON.parse(result.value);
          const options: MenuOption[] = data.mainMenu.map((m: any) => ({ name: m.label, description: "", value: m.value }));
          options.push({ name: "Sair", description: "Sair do aplicativo", value: "Exit" });
          setMenus(options);
        } catch {
          setMenus(getDefaultMenus());
        }
      } else {
        setMenus(getDefaultMenus());
      }
    }
    loadMenus();
  }, []);

  function getDefaultMenus(): MenuOption[] {
    return [
      { name: "Gerar Novo Prompt", description: "", value: "NewPrompt" },
      { name: "Ver Prompts Existentes", description: "", value: "ViewPrompts" },
      { name: "Gerar Contexto", description: "", value: "GenerateContext" },
      { name: "Gerar Padrão de Projeto", description: "", value: "ProjectPattern" },
      { name: "Configurações", description: "", value: "Settings" },
      { name: "Sair", description: "Sair do aplicativo", value: "Exit" }
    ];
  }

  const handleSelect = (index: number, item: any) => {
    if (!item) return;
    if (item.value === "Exit") {
      process.exit(0);
    } else {
      onNavigate(item.value);
    }
  };

  if (menus.length === 0) return <text>Carregando menu...</text>;

  return (
    <box flexDirection="column" alignItems="center" height="100%" justifyContent="center">
      <ascii-font text="Replication" font="block" />
      <box marginTop={2} border style={{ padding: 1, width: 40, height: 10 }}>
        <select 
          focused={true}
          style={{ height: 6 }}
          options={[
            { name: "Gerar Novo Prompt", description: "", value: "NewPrompt" },
            { name: "Ver Prompts Existentes", description: "", value: "ViewPrompts" },
            { name: "Gerar Contexto", description: "", value: "GenerateContext" },
            { name: "Gerar Padrão de Projeto", description: "", value: "ProjectPattern" },
            { name: "Configurações", description: "", value: "Settings" },
            { name: "Sair", description: "Sair do aplicativo", value: "Exit" }
          ]} 
          onSelect={handleSelect} 
        />
      </box>
    </box>
  );
}