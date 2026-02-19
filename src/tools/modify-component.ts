import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { generateContent } from '../gemini-client.js';
import { buildSystemPrompt } from '../system-prompt.js';
import type { Config } from '../config.js';

export const ModifyComponentSchema = z.object({
  code: z.string().describe('The complete current component code to modify'),
  instruction: z
    .string()
    .describe('What to change — be specific about the modification'),
  designNotes: z
    .string()
    .optional()
    .describe('Design constraints to maintain during modification'),
});

export type ModifyComponentInput = z.infer<typeof ModifyComponentSchema>;

export async function modifyComponent(
  client: GoogleGenAI,
  config: Config,
  input: ModifyComponentInput
): Promise<string> {
  const systemPrompt = buildSystemPrompt('modify', config.projectConfig);

  const parts: string[] = [
    `Modification Instruction: ${input.instruction}`,
  ];

  if (input.designNotes) {
    parts.push(`\nDesign Constraints:\n${input.designNotes}`);
  }

  parts.push(`\nCurrent Component Code:\n${input.code}`);

  const userPrompt = parts.join('\n');

  return generateContent(client, {
    systemPrompt,
    userPrompt,
    model: config.defaultModel,
    temperature: 0.5,
  });
}
