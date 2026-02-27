import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { FileService } from "../services/FileService";
import { join } from "path";
import { tmpdir } from "os";
import { mkdir, rm } from "fs/promises";

describe("FileService", () => {
    const testDir = join(tmpdir(), "replication-test-files");
    const testFile = join(testDir, "test.md");

    beforeAll(async () => {
        // Cria um diretorio limpo e temporario
        await mkdir(testDir, { recursive: true });
    });

    afterAll(async () => {
        // Limpa os arquivos temporarios criados apos a suite
        await rm(testDir, { recursive: true, force: true });
    });

    test("deve salvar um arquivo com sucesso", async () => {
        const res = await FileService.saveFile(testFile, "Hello Bun Test!");
        expect(res.ok).toBeTrue();

        // Validar usando bun nativo fora do servico
        const file = Bun.file(testFile);
        expect(await file.exists()).toBeTrue();
        expect(await file.text()).toBe("Hello Bun Test!");
    });

    test("deve ler o arquivo existente perfeitamente", async () => {
        const res = await FileService.readFile(testFile);
        expect(res.ok).toBeTrue();
        // typescript assume narrow no bloco if
        if (res.ok) {
            expect(res.value).toBe("Hello Bun Test!");
        }
    });

    test("deve retornar falha grace full lendo caminho invalido", async () => {
        const res = await FileService.readFile(join(testDir, "fantasma.md"));
        expect(res.ok).toBeFalse();
        if (!res.ok) {
            expect(res.error.name).toBe("BunFileError");
        }
    });

    test("deve listar os arquivos da pasta formatados na Promise<Result>", async () => {
        // Criando mais um arquivo pra teste
        await FileService.saveFile(join(testDir, "test2.md"), "# Test");

        const res = await FileService.readDir(testDir);
        expect(res.ok).toBeTrue();
        if (res.ok) {
            // Encontra test.md e test2.md e valida tipagem obrigatorias
            expect(res.value.length).toBe(2);

            // testa os items com find
            const foundTxt = res.value.find(v => v.name === "test.md");
            expect(foundTxt).toBeDefined();
            expect(foundTxt?.path).toBe(testFile); // Valor absoluto.
        }
    });

    test("deve deletar um arquivo com sucesso", async () => {
        const res = await FileService.deleteFile(testFile);
        expect(res.ok).toBeTrue();

        // Arquivo foi removido do bun
        const file = Bun.file(testFile);
        expect(await file.exists()).toBeFalse();
    });
});
