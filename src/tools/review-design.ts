import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { generateContent } from '../gemini-client.js';
import { buildSystemPrompt } from '../system-prompt.js';
import { MODEL } from '../config.js';
import type { Config } from '../config.js';

export const ReviewDesignSchema = z.object({
  code: z.string().describe('The component code to review for design quality'),
  context: z
    .string()
    .optional()
    .describe('Component purpose and screen context to guide the review'),
});

export type ReviewDesignInput = z.infer<typeof ReviewDesignSchema>;

export async function reviewDesign(
  client: GoogleGenAI,
  config: Config,
  input: ReviewDesignInput
): Promise<string> {
  const systemPrompt = buildSystemPrompt('review', config.projectConfig);

  const parts: string[] = [];

  if (input.context) {
    parts.push(`Component Context: ${input.context}`);
  }

  parts.push(`\nComponent Code to Review:\n${input.code}`);

  const userPrompt = parts.join('\n');

  return generateContent(client, {
    systemPrompt,
    userPrompt,
    model: MODEL,
    temperature: 0.3,
  });
}
