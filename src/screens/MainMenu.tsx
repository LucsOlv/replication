import { useState, useEffect } from "react";
import { useRenderer } from "@opentui/react";
import { FileService } from "../services/FileService";
import { ScreenContainer } from "../components/ScreenContainer";
import { CardSelect, SelectOption } from "../components/CustomSelect";
import { join } from "path";

interface Props {
  onNavigate: (screen: string) => void;
}

export function MainMenu({ onNavigate }: Props) {
  const renderer = useRenderer();
  const [menus, setMenus] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMenus() {
      const path = join(process.cwd(), "config", "menus.json");
      const result = await FileService.readFile(path);
      if (result.ok) {
        try {
          const data = JSON.parse(result.value);
          const options: SelectOption[] = data.mainMenu.map((m: any) => ({
            name: m.label,
            value: m.value,
          }));
          options.push({ name: "Sair", description: "Encerrar aplicativo", value: "Exit" });
          setMenus(options);
        } catch {
          setMenus(getDefaultMenus());
        }
      } else {
        setMenus(getDefaultMenus());
      }
      setLoading(false);
    }
    loadMenus();
  }, []);

  function getDefaultMenus(): SelectOption[] {
    return [
      { name: "Gerar Novo Prompt", description: "Criar prompt com IA", value: "NewPrompt" },
      { name: "Ver Prompts Existentes", description: "Listar prompts salvos", value: "ViewPrompts" },
      { name: "Gerar Contexto", description: "Analise de projeto", value: "GenerateContext" },
      { name: "Gerar Padrao de Projeto", description: "Documentar padroes", value: "ProjectPattern" },
      { name: "Configuracoes", description: "API key, modelo, pasta", value: "Settings" },
      { name: "SAIR", description: "Encerrar aplicativo", value: "Exit" },
    ];
  }

  const handleSelect = (item: SelectOption) => {
    if (item.value === "Exit") {
      renderer.destroy();
      process.exit(0);
    } else {
      onNavigate(item.value);
    }
  };

  if (loading) {
    return (
      <ScreenContainer title="Carregando...">
        <text>
          <span style={{ fg: "yellow" }}>Carregando menu...</span>
        </text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title="Selecione uma opcao">
      <CardSelect options={menus} onSelect={handleSelect} />
    </ScreenContainer>
  );
}
