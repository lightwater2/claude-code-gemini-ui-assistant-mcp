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
import { runInstall } from './install.js';

const cliArgs = process.argv.slice(2);

if (cliArgs[0] === 'install') {
  // Install subcommand: copy skill + register MCP
  runInstall(cliArgs.slice(1))
    .then(() => process.exit(0))
    .catch((err) => {
      process.stderr.write(`Install failed: ${err}\n`);
      process.exit(1);
    });
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
    version: '1.0.0',
  });

  // Tool: gemini_generate_component
  server.registerTool(
    'gemini_generate_component',
    {
      description:
        'Ask Gemini to generate a single React TypeScript component from scratch. ' +
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
        'Ask Gemini to review a React component for design quality issues: ' +
        'hardcoded colors, px values, missing accessibility attributes, inconsistencies.',
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

  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('[gemini-ui-mcp] Server started on stdio transport\n');
}
