import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { spawnSync } from 'child_process';
import * as readline from 'readline';

const PACKAGE_NAME = 'claude-code-gemini-ui-assistant-mcp';

function findSkillTemplate(): string {
  const thisFile = fileURLToPath(import.meta.url);
  const packageRoot = resolve(dirname(thisFile), '..');
  const templatePath = join(packageRoot, 'assets', 'skills', 'gemini-ui.md');
  if (!existsSync(templatePath)) {
    throw new Error(`Skill template not found at: ${templatePath}`);
  }
  return templatePath;
}

function installSkill(targetDir: 'user' | 'project'): string {
  const skillsDir =
    targetDir === 'user'
      ? join(homedir(), '.claude', 'skills')
      : join(process.cwd(), '.claude', 'skills');

  if (!existsSync(skillsDir)) {
    mkdirSync(skillsDir, { recursive: true });
  }

  const templatePath = findSkillTemplate();
  const destPath = join(skillsDir, 'gemini-ui.md');
  copyFileSync(templatePath, destPath);
  return destPath;
}

function promptApiKey(): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Hide input while typing
    const originalWrite = (rl as unknown as { output: { write: (s: string) => void } }).output.write.bind(
      (rl as unknown as { output: { write: (s: string) => void } }).output
    );
    let muted = false;
    (rl as unknown as { output: { write: (s: string) => void } }).output.write = (s: string) => {
      if (!muted) originalWrite(s);
      else if (s === '\r\n' || s === '\n') originalWrite(s);
    };

    process.stdout.write('  Enter your Gemini API key: ');
    muted = true;
    rl.question('', (answer) => {
      muted = false;
      process.stdout.write('\n');
      rl.close();
      resolve(answer.trim());
    });
  });
}

function registerMcp(apiKey: string): boolean {
  const result = spawnSync(
    'claude',
    [
      'mcp', 'add', 'gemini-ui',
      '--transport', 'stdio',
      '--scope', 'user',
      '--env', `GEMINI_API_KEY=${apiKey}`,
      '--',
      'npx', '-y', PACKAGE_NAME,
    ],
    { encoding: 'utf-8', stdio: 'pipe' }
  );

  if (result.error || result.status !== 0) {
    const msg = result.stderr || result.error?.message || 'unknown error';
    process.stderr.write(`  Registration failed: ${msg}\n`);
    return false;
  }
  return true;
}

function isInsideClaudeCode(): boolean {
  return !!process.env.CLAUDECODE;
}

function printFallbackInstructions(apiKey?: string) {
  const keyPlaceholder = apiKey ? apiKey : 'your-api-key';
  console.log('\n  Run this in a new terminal to register the MCP server:');
  console.log('');
  console.log(`  claude mcp add gemini-ui \\`);
  console.log(`    --transport stdio \\`);
  console.log(`    --scope user \\`);
  console.log(`    --env GEMINI_API_KEY=${keyPlaceholder} \\`);
  console.log(`    -- npx -y ${PACKAGE_NAME}`);
  console.log('');
}

export async function runInstall(args: string[]) {
  const isProject = args.includes('--project');
  const targetDir = isProject ? 'project' : 'user';
  const insideSession = isInsideClaudeCode();

  console.log(`\nInstalling ${PACKAGE_NAME}...\n`);

  // Step 1: Install skill file
  try {
    const destPath = installSkill(targetDir);
    console.log(`✅ Skill installed: ${destPath}`);
    console.log(`   Invoke with /gemini-ui inside Claude Code\n`);
  } catch (err) {
    console.error(`❌ Failed to install skill: ${err}`);
    process.exit(1);
  }

  // Step 2: Get API key
  let apiKey = process.env.GEMINI_API_KEY || '';

  if (apiKey) {
    console.log(`✅ GEMINI_API_KEY detected from environment`);
  } else {
    console.log(`🔑 Gemini API key needed to register MCP server.`);
    console.log(`   Get one at: https://aistudio.google.com/apikey\n`);
    apiKey = await promptApiKey();
  }

  if (!apiKey) {
    console.log(`\n⚠️  No API key provided — skipping MCP registration.`);
    printFallbackInstructions();
    console.log('Setup complete (partial). Add MCP manually when ready.\n');
    return;
  }

  // Step 3: Register MCP server
  if (insideSession) {
    // Cannot run claude CLI inside a Claude Code session
    console.log(`⚠️  Running inside Claude Code — cannot auto-register.`);
    printFallbackInstructions(apiKey);
    console.log('Setup complete (partial). Run the command above in a new terminal.\n');
    return;
  }

  console.log(`\n⏳ Registering MCP server with Claude Code...`);
  const ok = registerMcp(apiKey);

  if (ok) {
    console.log(`✅ MCP server registered: gemini-ui`);
    console.log(`   Verify with /mcp in Claude Code\n`);
    console.log(`Setup complete! 🎉\n`);
  } else {
    console.log(`\n⚠️  Auto-registration failed. Run manually:`);
    printFallbackInstructions(apiKey);
  }
}
