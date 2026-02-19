import { existsSync, mkdirSync, copyFileSync, rmSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { spawnSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';

const PACKAGE_NAME = 'claude-code-gemini-ui-assistant-mcp';

// ─── Skill installation ────────────────────────────────────────────────────

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

  // Skills are directories containing SKILL.md
  const skillDir = join(skillsDir, 'gemini-ui');
  if (!existsSync(skillDir)) mkdirSync(skillDir, { recursive: true });

  const destPath = join(skillDir, 'SKILL.md');
  copyFileSync(findSkillTemplate(), destPath);
  return destPath;
}

// ─── Masked input (shows * per keystroke) ─────────────────────────────────

function promptSecret(label: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(`  ${label}: `);

    const chars: string[] = [];
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    let done = false;

    const onData = (data: string) => {
      // Paste sends all characters in one chunk — iterate each one
      for (const char of data) {
        if (done) break;

        switch (char) {
          case '\r':
          case '\n':
          case '\u0004': // Ctrl+D
            done = true;
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdin.removeListener('data', onData);
            process.stdout.write('\n');
            resolve(chars.join(''));
            break;

          case '\u0003': // Ctrl+C
            process.stdout.write('\n');
            process.exit(0);
            break;

          case '\u007f': // Backspace (macOS)
          case '\b':     // Backspace (Windows)
            if (chars.length > 0) {
              chars.pop();
              process.stdout.write('\b \b');
            }
            break;

          default:
            // Only accept printable ASCII (skip terminal escape sequences)
            if (char >= ' ' && char <= '~') {
              chars.push(char);
              process.stdout.write('*');
            }
        }
      }
    };

    process.stdin.on('data', onData);
  });
}

// ─── API key validation ────────────────────────────────────────────────────

async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const client = new GoogleGenAI({ apiKey });
    await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
      config: { maxOutputTokens: 1 },
    });
    return true;
  } catch {
    return false;
  }
}

// ─── MCP registration ──────────────────────────────────────────────────────

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
    process.stderr.write(`  ${result.stderr || result.error?.message}\n`);
    return false;
  }
  return true;
}

function printFallbackCommand(apiKey: string) {
  console.log('\n  Run this in a new terminal:\n');
  console.log(`  claude mcp add gemini-ui \\`);
  console.log(`    --transport stdio \\`);
  console.log(`    --scope user \\`);
  console.log(`    --env GEMINI_API_KEY=${apiKey} \\`);
  console.log(`    -- npx -y ${PACKAGE_NAME}\n`);
}

// ─── Main ──────────────────────────────────────────────────────────────────

export async function runInstall(args: string[]) {
  const isProject = args.includes('--project');
  const insideSession = !!process.env.CLAUDECODE;

  console.log(`\nInstalling ${PACKAGE_NAME}...\n`);

  // Step 1: Install skill file
  try {
    const destPath = installSkill(isProject ? 'project' : 'user');
    console.log(`✅ Skill installed: ${destPath}`);
    console.log(`   Invoke with /gemini-ui inside Claude Code\n`);
  } catch (err) {
    console.error(`❌ Failed to install skill: ${err}`);
    process.exit(1);
  }

  // Step 2: Resolve API key
  let apiKey = process.env.GEMINI_API_KEY?.trim() ?? '';

  if (apiKey) {
    console.log(`✅ GEMINI_API_KEY detected from environment`);
  } else {
    console.log(`🔑 Gemini API key required  (get one at https://aistudio.google.com/apikey)\n`);
    apiKey = await promptSecret('Enter your Gemini API key');
  }

  if (!apiKey) {
    console.log(`\n⚠️  No API key provided — skipping MCP registration.`);
    console.log(`   Re-run with GEMINI_API_KEY set, or register manually.\n`);
    return;
  }

  // Step 3: Validate key
  process.stdout.write(`\n⏳ Validating API key...`);
  const valid = await validateApiKey(apiKey);

  if (!valid) {
    process.stdout.write(` ❌\n\n`);
    console.log(`  The API key appears to be invalid or lacks permission.`);
    console.log(`  Check your key at https://aistudio.google.com/apikey\n`);
    process.exit(1);
  }
  process.stdout.write(` ✅\n`);

  // Step 4: Register MCP server
  if (insideSession) {
    console.log(`\n⚠️  Running inside Claude Code — cannot auto-register.`);
    printFallbackCommand(apiKey);
    console.log(`Setup complete (partial). Run the command above in a new terminal.\n`);
    return;
  }

  process.stdout.write(`⏳ Registering MCP server...\n`);
  const ok = registerMcp(apiKey);

  if (ok) {
    console.log(`✅ MCP server registered: gemini-ui`);
    console.log(`   Verify with /mcp in Claude Code\n`);
    console.log(`Setup complete! 🎉\n`);
  } else {
    console.log(`\n⚠️  Auto-registration failed. Run manually:`);
    printFallbackCommand(apiKey);
  }
}

// ─── Uninstall ─────────────────────────────────────────────────────────────

export function runUninstall() {
  const insideSession = !!process.env.CLAUDECODE;

  console.log(`\nUninstalling ${PACKAGE_NAME}...\n`);

  // Step 1: Remove skill directories (user-level and project-level)
  const skillPaths = [
    join(homedir(), '.claude', 'skills', 'gemini-ui'),
    join(process.cwd(), '.claude', 'skills', 'gemini-ui'),
    // Legacy: flat .md file from older versions
    join(homedir(), '.claude', 'skills', 'gemini-ui.md'),
    join(process.cwd(), '.claude', 'skills', 'gemini-ui.md'),
  ];

  let skillRemoved = false;
  for (const p of skillPaths) {
    if (existsSync(p)) {
      rmSync(p, { recursive: true, force: true });
      console.log(`✅ Skill removed: ${p}`);
      skillRemoved = true;
    }
  }
  if (!skillRemoved) {
    console.log(`ℹ️  Skill not found (already removed)`);
  }

  // Step 2: Remove MCP server registration
  if (insideSession) {
    console.log(`\n⚠️  Running inside Claude Code — cannot auto-unregister.`);
    console.log(`   Run this in a new terminal:\n`);
    console.log(`   claude mcp remove gemini-ui\n`);
    return;
  }

  process.stdout.write(`⏳ Removing MCP server registration...\n`);
  const result = spawnSync(
    'claude',
    ['mcp', 'remove', 'gemini-ui', '--scope', 'user'],
    { encoding: 'utf-8', stdio: 'pipe' }
  );

  if (result.error || result.status !== 0) {
    const msg = result.stderr?.trim() || result.error?.message || '';
    if (msg.includes('not found') || msg.includes('No MCP')) {
      console.log(`ℹ️  MCP server was not registered (already removed)`);
    } else {
      console.log(`⚠️  Could not remove MCP registration: ${msg}`);
      console.log(`   Run manually: claude mcp remove gemini-ui`);
    }
  } else {
    console.log(`✅ MCP server unregistered: gemini-ui`);
  }

  console.log(`\nUninstall complete. To reinstall:\n`);
  console.log(`  npx ${PACKAGE_NAME} install\n`);
}
