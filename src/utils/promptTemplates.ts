import { Technique } from "../types";

export function getTechniquesContent(techniques: Technique[]): string {
  if (techniques.length === 0) return "Nenhuma técnica adicional.";

  return techniques.map(t => {
    return `\n[Técnica: ${t.name}]\n${t.template || t.description}\n`;
  }).join("\n");
}