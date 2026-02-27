import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { PromptBuilder } from "../services/PromptBuilder";
import { Format, Technique } from "../types";
import { FileService } from "../services/FileService";
import { join } from "path";
import { tmpdir } from "os";
import { spyOn } from "bun:test";
import { OpenRouterService } from "../services/OpenRouterService";
import { ok } from "../utils/result";

describe("PromptBuilder - Strategy Factory", () => {
    const templateDir = join(process.cwd(), "config", "templates");
    const testDir = join(tmpdir(), "replication-prompts");

    beforeAll(async () => {
        const fs = await import("fs/promises");
        await fs.mkdir(testDir, { recursive: true });

        // Ensure template folder exists and inject fake prompt-template.xml
        await fs.mkdir(templateDir, { recursive: true });
        const dummyXml = `<?xml version="1.0" encoding="UTF-8"?>
<prompt>
  <task>{{TITULO_DA_TAREFA}}</task>
  <constraints>No limits</constraints>
  <expected_output>JSON</expected_output>
  <chain_of_thought>Passo a passo!</chain_of_thought>
</prompt>`;
        await Bun.write(join(templateDir, "prompt-template.xml"), dummyXml);

        spyOn(OpenRouterService, "generate").mockImplementation(async (prompt: string) => {
            return ok(">> LLM PROMPT GENERATED MOCK <<\n\n" + prompt.substring(prompt.indexOf("TEMPLATE A PREENCHER:") + 21).trim());
        });
    });

    afterAll(async () => {
        const fs = await import("fs/promises");
        await fs.rm(testDir, { recursive: true, force: true });
        // Restore/Clean fake dummy xml if we created it
        await Bun.file(join(templateDir, "prompt-template.xml")).delete().catch(() => null);
    });

    const mockTechniques: Technique[] = [
        { id: "t1", name: "Chain of Thought", description: "...", template: "Pense passo-a-passo: {{task}}" }
    ];

    test("deve compilar prompt MARKDOWN perfeitamente omitindo sections nulas", async () => {
        const format: Format = { id: "markdown", name: "MD", description: "" };
        const res = await PromptBuilder.build("Diga oi", "Seja gentil", format, [], undefined, undefined);

        expect(res.ok).toBeTrue();
        if (res.ok) {
            // Validate the markdown compilation structure 
            expect(res.value).toContain("Diga oi");
            expect(res.value).toContain("Seja gentil");
            expect(res.value).not.toContain("Padrões do Projeto"); // not passed
        }
    });

    test("deve compilar prompt XML usando as tags declaradas no contrato", async () => {
        const format: Format = { id: "xml", name: "XML", description: "" };
        const patterns = "Alguns padroes XML.";

        const res = await PromptBuilder.build("Codar JS", "Use react", format, mockTechniques, patterns, undefined);

        expect(res.ok).toBeTrue();
        if (res.ok) {
            expect(res.value).toContain(">> LLM PROMPT GENERATED MOCK <<");
            expect(res.value).toContain("<task>Use react</task>");
            expect(res.value).toContain("<constraints>No limits</constraints>");
            expect(res.value).toContain("<expected_output>JSON</expected_output>");
            expect(res.value).toContain("<project_patterns>\nAlguns padroes XML.\n</project_patterns>");
            expect(res.value).not.toContain("<project_context>");
        }
    });

    test("deve gerar o arquivo salvando no diretorio destino e devolvendo o fullPath", async () => {
        const format: Format = { id: "markdown", name: "MD", description: "" };
        const content = "# Teste salvo";

        const res = await PromptBuilder.save(content, "Tarefa-Teste 2", format, testDir);

        expect(res.ok).toBeTrue();
        if (res.ok) {
            // checar path
            expect(res.value).toStartWith(testDir);
            expect(res.value).toEndWith(".md");

            const savedParams = Bun.file(res.value);
            expect(await savedParams.text()).toBe("# Teste salvo");
        }
    });
});
