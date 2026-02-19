import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { generateContent } from '../gemini-client.js';
import { buildSystemPrompt } from '../system-prompt.js';
import type { Config } from '../config.js';

export const GenerateComponentSchema = z.object({
  name: z.string().describe('Component name in PascalCase (e.g. UserProfileCard)'),
  description: z
    .string()
    .describe('What the component does — functionality, purpose, behavior'),
  props: z
    .string()
    .optional()
    .describe('Props interface description (e.g. "userId: string, onClose: () => void")'),
  designNotes: z
    .string()
    .optional()
    .describe('Design requirements: colors, layout, spacing, visual style'),
  references: z
    .string()
    .optional()
    .describe('Existing code to reference for patterns — paste relevant snippets'),
  layer: z
    .enum(['shared', 'entities', 'features', 'widgets'])
    .optional()
    .describe('FSD layer this component belongs to'),
});

export type GenerateComponentInput = z.infer<typeof GenerateComponentSchema>;

export async function generateComponent(
  client: GoogleGenAI,
  config: Config,
  input: GenerateComponentInput
): Promise<string> {
  const systemPrompt = buildSystemPrompt('generate', config.projectConfig);

  const parts: string[] = [
    `Component Name: ${input.name}`,
    `Description: ${input.description}`,
  ];

  if (input.layer) {
    parts.push(`FSD Layer: ${input.layer}`);
    const pattern = config.projectConfig.componentPatterns?.[input.layer];
    if (pattern) {
      parts.push(`File Path Pattern: ${pattern.replace('{name}', input.name)}`);
    }
  }

  if (input.props) {
    parts.push(`\nProps Interface:\n${input.props}`);
  }

  if (input.designNotes) {
    parts.push(`\nDesign Notes:\n${input.designNotes}`);
  }

  if (input.references) {
    parts.push(`\nReference Code (for patterns/conventions):\n${input.references}`);
  }

  const userPrompt = parts.join('\n');

  return generateContent(client, {
    systemPrompt,
    userPrompt,
    model: config.defaultModel,
    temperature: 0.6,
  });
}
