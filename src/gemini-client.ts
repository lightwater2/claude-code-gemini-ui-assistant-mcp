import { GoogleGenAI } from '@google/genai';
import type { Part } from '@google/genai';
import type { Config } from './config.js';

let _client: GoogleGenAI | null = null;

export function createClient(config: Config): GoogleGenAI {
  if (_client) return _client;

  if (config.gemini.useVertexAI) {
    _client = new GoogleGenAI({
      vertexai: true,
      project: config.gemini.project,
      location: config.gemini.location,
    });
    process.stderr.write(
      `[gemini-ui-mcp] Initialized Vertex AI client (project=${config.gemini.project}, location=${config.gemini.location})\n`
    );
  } else {
    if (!config.gemini.apiKey) {
      throw new Error(
        'GEMINI_API_KEY is required when GOOGLE_GENAI_USE_VERTEXAI is not set'
      );
    }
    _client = new GoogleGenAI({ apiKey: config.gemini.apiKey });
    process.stderr.write('[gemini-ui-mcp] Initialized AI Studio client\n');
  }

  return _client;
}

export interface GenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  parts?: Part[];  // 멀티모달 콘텐츠 (이미지 + 텍스트) — screenshot_to_code용
  model: string;
  temperature?: number;
}

export async function generateContent(
  client: GoogleGenAI,
  options: GenerateOptions
): Promise<string> {
  const { systemPrompt, userPrompt, parts, model, temperature = 0.7 } = options;

  const contents = parts
    ? [{ role: 'user' as const, parts }]
    : [{ role: 'user' as const, parts: [{ text: userPrompt }] }];

  const response = await client.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: systemPrompt,
      temperature,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Gemini returned empty response');
  }

  return text;
}
