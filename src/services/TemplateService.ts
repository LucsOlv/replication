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
    project_context: "project_context",
    project_patterns: "project_patterns",
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
                let section = allSections.get(tag)!;
                
                // Replace context or patterns placeholders if provided
                if (sectionId === "project_context" && context) {
                    section = section.replace("{{CONTEXTO_DO_PROJETO}}", context);
                }
                if (sectionId === "project_patterns" && patterns) {
                    section = section.replace("{{PADROES_DO_PROJETO}}", patterns);
                }
                
                selectedParts.push(section);
            }
        }

        // 2. Add fixed sections (always present)
        for (const fixedTag of FIXED_SECTIONS) {
            if (allSections.has(fixedTag)) {
                selectedParts.push(allSections.get(fixedTag)!);
            }
        }

        // 3. Compose the final XML
        const composedXml = `<?xml version="1.0" encoding="UTF-8"?>
<prompt version="1.0" name="${projectName}">

${selectedParts.join("\n\n")}

</prompt>
`;

        // 4. Replace the task description placeholder
        const finalXml = composedXml.replace("{{TITULO_DA_TAREFA}}", taskDescription);

        return ok(finalXml);
    }
}

