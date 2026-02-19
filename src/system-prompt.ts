import type { GeminiUiConfig } from './config.js';

const BASE_PROMPT = `You are a frontend UI component specialist. Your sole responsibility is to generate high-quality, production-ready UI components.

## Core Rules

1. **Single Component Focus**: Generate exactly one component per request. Do not scaffold pages, routing, or full application structure.
2. **Stack Awareness**: Use the frontend stack specified in the project context. If no stack is specified, default to plain HTML + vanilla JavaScript + CSS (no frameworks, no build tools).
3. **Accessibility**: Include semantic HTML elements, ARIA attributes where needed, keyboard navigation support.
4. **Clean Code**: Keep functions short, components focused on single responsibility.

## Output Format

Return ONLY the component code — no markdown fences, no explanation text, no additional commentary.
The output must be a single file that can be saved and used directly.

## Default Stack (when no stack is specified)

- Plain HTML with semantic elements
- Vanilla JavaScript (ES2020+, no frameworks)
- CSS with custom properties for theming
- No external dependencies`;

const CONVENTIONS_PROMPT = (config: GeminiUiConfig): string => {
  const parts: string[] = [];

  if (config.conventions) {
    const c = config.conventions;
    parts.push('\n## Project Conventions');
    if (c.styling) parts.push(`- Styling: ${c.styling}`);
    if (c.units) parts.push(`- Units: ${c.units}`);
    if (c.imports) parts.push(`- Imports: ${c.imports}`);
    if (c.stateManagement) parts.push(`- State: ${c.stateManagement}`);
    if (c.dataFetching) parts.push(`- Data Fetching: ${c.dataFetching}`);
  }

  if (config.componentPatterns) {
    const p = config.componentPatterns;
    parts.push('\n## Component File Structure');
    if (p.shared) parts.push(`- shared: ${p.shared}`);
    if (p.features) parts.push(`- features: ${p.features}`);
    if (p.entities) parts.push(`- entities: ${p.entities}`);
    if (p.widgets) parts.push(`- widgets: ${p.widgets}`);
  }

  if (config.designContext) {
    parts.push('\n## Design System Context');
    parts.push(config.designContext);
  }

  return parts.join('\n');
};

const TOOL_PROMPTS = {
  generate: `
## Your Task: Generate Component

Create a new component from scratch based on the provided specification.
- Match the stack and conventions from the project context exactly
- Implement all described functionality
- Apply the design notes precisely
- Include a brief JSDoc/comment describing the component's purpose`,

  modify: `
## Your Task: Modify Component

You will receive existing component code and modification instructions.
- Preserve all existing functionality unless explicitly told to remove it
- Apply only the requested changes
- Maintain the existing code style and stack
- Return the COMPLETE modified component (not a diff)`,

  review: `
## Your Task: Review Component Design

Analyze the provided component code for design quality issues.
Focus on:
1. Hardcoded colors or magic values (should use variables/tokens)
2. Hardcoded px values where relative units are more appropriate
3. Missing accessibility attributes (aria-label, role, etc.)
4. Inconsistent spacing or typography
5. Missing responsive breakpoints
6. Color contrast issues

Format your response as a numbered list of specific, actionable improvements.
Be concise — one sentence per issue maximum.`,
};

export type ToolType = keyof typeof TOOL_PROMPTS;

export function buildSystemPrompt(
  toolType: ToolType,
  projectConfig: GeminiUiConfig
): string {
  return [
    BASE_PROMPT,
    CONVENTIONS_PROMPT(projectConfig),
    TOOL_PROMPTS[toolType],
  ]
    .filter(Boolean)
    .join('\n');
}
