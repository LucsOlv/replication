export class ConfigError extends Error {
  readonly type = "config";
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export class GeminiError extends Error {
  readonly type = "gemini";
  constructor(message: string) {
    super(message);
    this.name = "GeminiError";
  }
}

export class FileSystemError extends Error {
  readonly type = "filesystem";
  constructor(message: string) {
    super(message);
    this.name = "FileSystemError";
  }
}

export class ValidationError extends Error {
  readonly type = "validation";
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}