export class ConfigError extends Error {
  readonly type = "config";
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export class OpenRouterError extends Error {
  readonly type = "openrouter";
  constructor(message: string) {
    super(message);
    this.name = "OpenRouterError";
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

export class BunFileError extends Error {
  readonly type = "bunfile";
  constructor(message: string) {
    super(message);
    this.name = "BunFileError";
  }
}

export class JsonParseError extends Error {
  readonly type = "jsonparse";
  constructor(message: string) {
    super(message);
    this.name = "JsonParseError";
  }
}