import { join } from "path";
import { Result, ok, err } from "../utils/result";

export interface LogEntry {
    id: string;
    timestamp: string;
    context: string;
    type: "request" | "response" | "error" | "info";
    data: any;
}

export class LogService {
    private static readonly LOG_DIR = join(process.cwd(), ".logs");

    private static async ensureLogDir(): Promise<void> {
        const fs = await import("fs/promises");
        try {
            await fs.mkdir(this.LOG_DIR, { recursive: true });
        } catch (e) {
            // Ignora erro se o diretório já existir
        }
    }

    private static generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    private static async writeLog(entry: LogEntry, interactionId?: string): Promise<Result<void, Error>> {
        await this.ensureLogDir();

        // Group logs by interaction if interactionId is provided, otherwise generate a new one
        const filenameId = interactionId || entry.id;
        const dateStr = new Date(entry.timestamp).toISOString().split('T')[0];
        const filename = `log-${dateStr}-${filenameId}.json`;
        const filePath = join(this.LOG_DIR, filename);

        try {
            const bunFile = Bun.file(filePath);
            let existingLogs: LogEntry[] = [];

            if (await bunFile.exists()) {
                const content = await bunFile.text();
                try {
                    existingLogs = JSON.parse(content);
                } catch (e) {
                    // If file is corrupted or empty, start fresh
                    existingLogs = [];
                }
            }

            existingLogs.push(entry);
            await Bun.write(filePath, JSON.stringify(existingLogs, null, 2));
            return ok(undefined);
        } catch (e: any) {
            return err(new Error(`Failed to write log: ${e.message}`));
        }
    }

    static async logRequest(context: string, payload: any, interactionId?: string): Promise<string> {
        const id = this.generateId();
        const resolvedId = interactionId || id;
        const entry: LogEntry = {
            id: resolvedId,
            timestamp: new Date().toISOString(),
            context,
            type: "request",
            data: payload,
        };
        await this.writeLog(entry, resolvedId);
        return resolvedId;
    }

    static async logResponse(context: string, response: any, interactionId: string): Promise<void> {
        const entry: LogEntry = {
            id: interactionId,
            timestamp: new Date().toISOString(),
            context,
            type: "response",
            data: response,
        };
        await this.writeLog(entry, interactionId);
    }

    static async logError(context: string, error: any, interactionId?: string): Promise<void> {
        const entry: LogEntry = {
            id: interactionId || this.generateId(),
            timestamp: new Date().toISOString(),
            context,
            type: "error",
            data: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        };
        await this.writeLog(entry, interactionId);
    }

    static async logInfo(context: string, info: any, interactionId?: string): Promise<string> {
        const id = this.generateId();
        const resolvedId = interactionId || id;
        const entry: LogEntry = {
            id: resolvedId,
            timestamp: new Date().toISOString(),
            context,
            type: "info",
            data: info,
        };
        await this.writeLog(entry, resolvedId);
        return resolvedId;
    }
}
