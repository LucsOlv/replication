export interface Technique {
  id: string;
  name: string;
  description: string;
  template?: string;
}

export interface Format {
  id: string;
  name: string;
  description: string;
}

export interface AppConfig {
  apiKey: string;
  outputDir: string;
  model: string;
}

export interface SavedPrompt {
  name: string;
  path: string;
  createdAt: Date;
  size: number;
}