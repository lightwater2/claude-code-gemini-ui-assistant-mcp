import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { generateContent } from '../gemini-client.js';
import { buildSystemPrompt } from '../system-prompt.js';
import { MODEL } from '../config.js';
import type { Config } from '../config.js';

export const GenerateComponentSetSchema = z.object({
  pageContext: z
    .string()
    .describe('Description of the page/screen where these components will be used — guides design cohesion'),
  components: z
    .string()
    .describe('JSON array of component specs: [{ name: string, description: string, props?: string }]'),
  designNotes: z
    .string()
    .optional()
    .describe('Shared design requirements applied to the entire component set (stack, colors, spacing, etc.)'),
  references: z
    .string()
    .optional()
    .describe('Existing component code for pattern and style matching — paste relevant snippets'),
});

export type GenerateComponentSetInput = z.infer<typeof GenerateComponentSetSchema>;

/**
 * Strips markdown code fences from Gemini JSON response.
 * Gemini may wrap JSON in ```json ... ``` blocks even when instructed not to.
 */
function parseComponentSetResponse(raw: string): string {
  const cleaned = raw
    .replace(/^```(?:json)?\n?/gm, '')
    .replace(/\n?```\s*$/gm, '')
    .trim();

  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {
    // Return raw text so Claude can attempt manual parsing
    return raw;
  }
}

export async function generateComponentSet(
  client: GoogleGenAI,
  config: Config,
  input: GenerateComponentSetInput
): Promise<string> {
  const systemPrompt = buildSystemPrompt('componentSet', config.projectConfig);

  const parts: string[] = [
    `Page Context: ${input.pageContext}`,
    `\nComponents to Generate:\n${input.components}`,
  ];

  if (input.designNotes) {
    parts.push(`\nShared Design Notes (apply to ALL components):\n${input.designNotes}`);
  }

  if (input.references) {
    parts.push(`\nReference Code (match these patterns and conventions):\n${input.references}`);
  }

  parts.push(
    '\nGenerate all components now. Return valid JSON: { "components": [{ "name": "...", "code": "..." }] }'
  );

  const userPrompt = parts.join('\n');

  const raw = await generateContent(client, {
    systemPrompt,
    userPrompt,
    model: MODEL,
    temperature: 0.6,
  });

  return parseComponentSetResponse(raw);
}
