import { join } from "path";
import { Technique } from "../types";
import { Result, ok, err } from "../utils/result";
import { BunFileError } from "../utils/errors";
import { FileService } from "./FileService";

// Maps each sectionId from techniques.json to the XML tag name in prompt-template.xml
const SECTION_TAG_MAP: Record<string, string> = {
    role: "role",
    generated_knowledge: "generated_knowledge",
    few_shot_examples: "few_shot_examples",
    chain_of_thought: "chain_of_thought",
    tree_of_thoughts: "tree_of_thoughts",
    self_consistency: "self_consistency",
    react_loop: "react_loop",
    maieutic_prompting: "maieutic_prompting",
};

// Sections that are ALWAYS included in the generated template
const FIXED_SECTIONS = ["task", "error_handling_pattern", "constraints", "expected_output"];

export class TemplateService {
    /**
     * Reads the full prompt-template.xml and extracts individual sections.
     * Returns a map of sectionTag -> section XML content (including the tag itself).
     */
    static async parseSections(): Promise<Result<Map<string, string>, BunFileError>> {
        const templatePath = join(process.cwd(), "config", "templates", "prompt-template.xml");
        const result = await FileService.readFile(templatePath);

        if (!result.ok) {
            return err(result.error);
        }

        const xml = result.value;
        const sections = new Map<string, string>();

        // Extract all top-level tags within <prompt>
        const allTags = [...Object.values(SECTION_TAG_MAP), ...FIXED_SECTIONS];

        for (const tag of allTags) {
            const regex = new RegExp(
                `(\\s*<!--[\\s\\S]*?-->\\s*)?\\s*<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`,
                "m"
            );
            const match = xml.match(regex);
            if (match) {
                sections.set(tag, match[0]);
            }
        }

        return ok(sections);
    }

    /**
     * Builds a composed template XML using only the sections corresponding
     * to the selected techniques + the fixed sections (task, constraints, expected_output).
     */
    static async buildFromTechniques(
        projectName: string,
        taskDescription: string,
        techniques: Technique[],
        patterns?: string,
        context?: string
    ): Promise<Result<string, BunFileError>> {
        const sectionsResult = await this.parseSections();
        if (!sectionsResult.ok) {
            return err(sectionsResult.error);
        }

        const allSections = sectionsResult.value;
        const selectedParts: string[] = [];

        // 1. Add technique sections (only selected)
        for (const tech of techniques) {
            const sectionId = tech.sectionId;
            if (!sectionId) continue;

            const tag = SECTION_TAG_MAP[sectionId];
            if (tag && allSections.has(tag)) {
                selectedParts.push(allSections.get(tag)!);
            }
        }

        // 2. Add fixed sections (always present)
        for (const fixedTag of FIXED_SECTIONS) {
            if (allSections.has(fixedTag)) {
                selectedParts.push(allSections.get(fixedTag)!);
            }
        }

        // 3. Add Context and Patterns if available
        if (patterns) {
            selectedParts.push(`<project_patterns>\n${patterns}\n</project_patterns>`);
        }

        if (context) {
            selectedParts.push(`<project_context>\n${context}\n</project_context>`);
        }

        // 4. Compose the final XML
        const composedXml = `<?xml version="1.0" encoding="UTF-8"?>
<prompt version="1.0" name="${projectName}">

${selectedParts.join("\n\n")}

</prompt>
`;

        // 5. Replace the task description placeholder
        const finalXml = composedXml.replace("{{TITULO_DA_TAREFA}}", taskDescription);

        return ok(finalXml);
    }

    /**
     * Builds a Markdown version of the template for non-XML formats.
     * Converts the XML sections into readable markdown headings.
     */
    static buildMarkdownFromTechniques(
        projectName: string,
        taskDescription: string,
        techniques: Technique[],
        patterns?: string,
        context?: string
    ): string {
        const parts: string[] = [];

        parts.push(`# ${projectName}\n`);

        // Add technique sections as markdown
        for (const tech of techniques) {
            parts.push(`## ${tech.name}\n`);
            parts.push(`${tech.template || tech.description}\n`);
        }

        // Add Context and Patterns if available
        if (patterns) {
            parts.push(`## Padrões do Projeto\n`);
            parts.push(`${patterns}\n`);
        }

        if (context) {
            parts.push(`## Contexto do Projeto\n`);
            parts.push(`${context}\n`);
        }

        // Add fixed sections
        parts.push(`## Tarefa Principal\n`);
        parts.push(`${taskDescription}\n`);

        parts.push(`## Constraints\n`);
        parts.push(`Defina as regras inegociáveis do projeto.\n`);

        parts.push(`## Output Esperado\n`);
        parts.push(`Defina o formato e critérios de qualidade da entrega.\n`);

        return parts.join("\n");
    }
}
