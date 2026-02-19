import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export interface ProjectConventions {
  styling?: string;
  units?: string;
  imports?: string;
  stateManagement?: string;
  dataFetching?: string;
}

export interface ComponentPatterns {
  shared?: string;
  features?: string;
  entities?: string;
  widgets?: string;
}

export interface GeminiUiConfig {
  model?: string;
  designContext?: string;
  conventions?: ProjectConventions;
  componentPatterns?: ComponentPatterns;
}

export interface Config {
  gemini: {
    useVertexAI: boolean;
    apiKey?: string;
    project?: string;
    location: string;
    applicationCredentials?: string;
  };
  defaultModel: string;
  projectConfig: GeminiUiConfig;
}

function loadProjectConfig(): GeminiUiConfig {
  // Check env var for config path first, then fall back to cwd
  const configPath =
    process.env.GEMINI_UI_CONFIG ||
    resolve(process.cwd(), '.gemini-ui-config.json');

  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, 'utf-8');
      return JSON.parse(raw) as GeminiUiConfig;
    } catch (err) {
      process.stderr.write(
        `[gemini-ui-mcp] Warning: Failed to parse config at ${configPath}: ${err}\n`
      );
    }
  }

  return {};
}

export function loadConfig(): Config {
  const useVertexAI = process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true';
  const projectConfig = loadProjectConfig();

  return {
    gemini: {
      useVertexAI,
      apiKey: process.env.GEMINI_API_KEY,
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
      applicationCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    },
    defaultModel: projectConfig.model || 'gemini-2.5-flash',
    projectConfig,
  };
}
