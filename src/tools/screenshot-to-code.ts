import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { generateContent } from '../gemini-client.js';
import { buildSystemPrompt } from '../system-prompt.js';
import { MODEL } from '../config.js';
import type { Config } from '../config.js';

export const ScreenshotToCodeSchema = z.object({
  imageBase64: z
    .string()
    .describe('Base64-encoded image data (PNG/JPG/WebP) — no data URL prefix needed'),
  mimeType: z
    .enum(['image/png', 'image/jpeg', 'image/webp'])
    .optional()
    .default('image/png')
    .describe('MIME type of the image (default: image/png)'),
  description: z
    .string()
    .optional()
    .describe('Description of the screenshot and what code to generate from it'),
  outputType: z
    .enum(['component', 'page', 'styles'])
    .optional()
    .default('component')
    .describe('Type of output to generate: component, full page, or styles only'),
  designNotes: z
    .string()
    .optional()
    .describe('Stack, framework, design system constraints to apply during code generation'),
  references: z
    .string()
    .optional()
    .describe('Existing code patterns to match — paste relevant snippets'),
});

export type ScreenshotToCodeInput = z.infer<typeof ScreenshotToCodeSchema>;

export async function screenshotToCode(
  client: GoogleGenAI,
  config: Config,
  input: ScreenshotToCodeInput
): Promise<string> {
  const systemPrompt = buildSystemPrompt('screenshotToCode', config.projectConfig);

  const mimeType = input.mimeType ?? 'image/png';
  const outputType = input.outputType ?? 'component';

  // 텍스트 프롬프트 구성
  const textParts: string[] = [];

  if (input.description) {
    textParts.push(`Screenshot Description: ${input.description}`);
  }

  textParts.push(`Output Type: ${outputType}`);

  if (input.designNotes) {
    textParts.push(`\nDesign System / Stack Constraints:\n${input.designNotes}`);
  }

  if (input.references) {
    textParts.push(`\nReference Code (match these patterns):\n${input.references}`);
  }

  textParts.push('\nAnalyze the image above and generate the corresponding code.');

  // 멀티모달 파트 구성: 이미지 → 텍스트 순서
  const parts = [
    {
      inlineData: {
        mimeType,
        data: input.imageBase64,
      },
    },
    {
      text: textParts.join('\n'),
    },
  ];

  return generateContent(client, {
    systemPrompt,
    userPrompt: '',  // parts를 직접 사용하므로 userPrompt는 무시됨
    parts,
    model: MODEL,
    temperature: 0.5,
  });
}
