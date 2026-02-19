#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { createClient } from './gemini-client.js';
import {
  GenerateComponentSchema,
  generateComponent,
} from './tools/generate-component.js';
import {
  ModifyComponentSchema,
  modifyComponent,
} from './tools/modify-component.js';
import {
  ReviewDesignSchema,
  reviewDesign,
} from './tools/review-design.js';
import {
  GenerateComponentSetSchema,
  generateComponentSet,
} from './tools/generate-component-set.js';
import {
  ScreenshotToCodeSchema,
  screenshotToCode,
} from './tools/screenshot-to-code.js';
import { runInstall, runUninstall } from './install.js';

const cliArgs = process.argv.slice(2);

if (cliArgs[0] === 'install') {
  // Install subcommand: copy skill + register MCP
  runInstall(cliArgs.slice(1))
    .then(() => process.exit(0))
    .catch((err) => {
      process.stderr.write(`Install failed: ${err}\n`);
      process.exit(1);
    });
} else if (cliArgs[0] === 'uninstall') {
  // Uninstall subcommand: remove skill + unregister MCP
  runUninstall();
  process.exit(0);
} else {
  // Default: start MCP server on stdio
  startServer().catch((err) => {
    process.stderr.write(`[gemini-ui-mcp] Fatal error: ${err}\n`);
    process.exit(1);
  });
}

async function startServer() {
  const config = loadConfig();
  const client = createClient(config);

  const server = new McpServer({
    name: 'gemini-ui-assistant',
    version: '2.0.0',
  });

  // Tool: gemini_generate_component
  server.registerTool(
    'gemini_generate_component',
    {
      description:
        'Ask Gemini to generate a single UI component from scratch. ' +
        'Stack-agnostic: works with any frontend framework (React, Vue, Svelte, plain HTML, etc.). ' +
        'Claude handles page structure and orchestration; Gemini focuses on component code generation.',
      inputSchema: GenerateComponentSchema,
    },
    async (input) => {
      try {
        const code = await generateComponent(client, config, input);
        return { content: [{ type: 'text', text: code }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
      }
    }
  );

  // Tool: gemini_modify_component
  server.registerTool(
    'gemini_modify_component',
    {
      description:
        'Pass existing component code to Gemini with modification instructions. ' +
        'Stack-agnostic: works with any frontend framework. ' +
        'Returns the complete modified component code.',
      inputSchema: ModifyComponentSchema,
    },
    async (input) => {
      try {
        const code = await modifyComponent(client, config, input);
        return { content: [{ type: 'text', text: code }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
      }
    }
  );

  // Tool: gemini_review_design
  server.registerTool(
    'gemini_review_design',
    {
      description:
        'Ask Gemini to review a UI component for design quality issues: ' +
        'hardcoded colors, px values, missing accessibility attributes, inconsistencies. ' +
        'Stack-agnostic: works with any frontend framework.',
      inputSchema: ReviewDesignSchema,
    },
    async (input) => {
      try {
        const review = await reviewDesign(client, config, input);
        return { content: [{ type: 'text', text: review }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
      }
    }
  );

  // Tool: gemini_generate_component_set
  server.registerTool(
    'gemini_generate_component_set',
    {
      description:
        'Ask Gemini to generate multiple UI components as a cohesive set in one request. ' +
        'Guarantees design consistency (colors, spacing, typography) across all components ' +
        'because they are generated in a single Gemini context. ' +
        'Use this instead of calling gemini_generate_component repeatedly when components must look unified. ' +
        'Returns JSON: { "components": [{ "name": "...", "code": "..." }] }',
      inputSchema: GenerateComponentSetSchema,
    },
    async (input) => {
      try {
        const result = await generateComponentSet(client, config, input);
        return { content: [{ type: 'text', text: result }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
      }
    }
  );

  // Tool: gemini_screenshot_to_code
  server.registerTool(
    'gemini_screenshot_to_code',
    {
      description:
        'Send a screenshot or design image to Gemini Vision and receive UI code. ' +
        'Analyzes layout, colors, typography, and interactive elements from the image. ' +
        'Accepts base64-encoded PNG/JPG/WebP images. ' +
        'Useful for converting Figma screenshots, mockups, or reference designs into code.',
      inputSchema: ScreenshotToCodeSchema,
    },
    async (input) => {
      try {
        const code = await screenshotToCode(client, config, input);
        return { content: [{ type: 'text', text: code }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
      }
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('[gemini-ui-mcp] Server started on stdio transport\n');
}
