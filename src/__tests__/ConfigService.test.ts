import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { ConfigService } from "../services/ConfigService";
import { AppConfig } from "../types";
import { join } from "path";
import { homedir } from "os";

import { mkdir } from "fs/promises";

// Backup em memoria
let originalContent: string | null = null;
const configDir = join(homedir(), ".replication");
const configPath = join(configDir, "config.json");

describe("ConfigService", () => {

    beforeAll(async () => {
        await mkdir(configDir, { recursive: true });
        // Guarda conteudo original (se houver) para nao quebrar a config dev do usuario local
        const file = Bun.file(configPath);
        if (await file.exists()) {
            originalContent = await file.text();
        }
    });

    afterAll(async () => {
        // Restaura ou exclui criados na test suite
        if (originalContent) {
            await Bun.write(configPath, originalContent);
        } else {
            const testFile = Bun.file(configPath);
            if (await testFile.exists()) {
                await testFile.delete(); // cleanup fallback
            }
        }
    });

    test("deve salvar corretamente a string JSON na configuracao base", async () => {
        const dummyConfig: AppConfig = {
            apiKey: "sk-or-test-123",
            outputDir: "/test/dir",
            model: "google/gemini-2.8-ultra"
        };

        const res = await ConfigService.save(dummyConfig);
        expect(res.ok).toBeTrue();

        // Ler manualmente pra garantir
        const writtenConfigText = await Bun.file(configPath).text();
        const objectRead = JSON.parse(writtenConfigText);
        expect(objectRead.apiKey).toBe("sk-or-test-123");
    });

    test("deve carregar com sucesso a configuracao valida salva", async () => {
        const res = await ConfigService.load();
        expect(res.ok).toBeTrue();
        if (res.ok) {
            expect(res.value.outputDir).toBe("/test/dir");
            expect(res.value.model).toBe("google/gemini-2.8-ultra");
        }
    });

    test("deve retornar erro JsonParseError caso um arquivo seja corrompido", async () => {
        // corromper a string
        await Bun.write(configPath, '{"apiKey": "sk-corrupt", }'); // JSON invalido

        const res = await ConfigService.load();
        expect(res.ok).toBeFalse();
        if (!res.ok) {
            expect(res.error.name).toBe("JsonParseError");
        }
    });
});
