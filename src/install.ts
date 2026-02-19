import { existsSync, mkdirSync, copyFileSync, readFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const PACKAGE_NAME = 'claude-code-gemini-ui-assistant-mcp';

function findSkillTemplate(): string {
  // Resolve path relative to this file (works with npx and local builds)
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

function printMcpInstructions(mode: 'aistudio' | 'vertex' | 'both') {
  const serverCmd = `-- npx -y ${PACKAGE_NAME}`;

  console.log('\n─────────────────────────────────────────────────');
  console.log('Register the MCP server with Claude Code:');
  console.log('─────────────────────────────────────────────────');

  if (mode === 'aistudio' || mode === 'both') {
    console.log('\n# Option A: Google AI Studio (API Key)');
    console.log(`claude mcp add gemini-ui \\`);
    console.log(`  --transport stdio \\`);
    console.log(`  --scope user \\`);
    console.log(`  --env GEMINI_API_KEY=your-api-key \\`);
    console.log(`  ${serverCmd}`);
  }

  if (mode === 'vertex' || mode === 'both') {
    console.log('\n# Option B: Vertex AI (ADC / Service Account)');
    console.log(`claude mcp add gemini-ui \\`);
    console.log(`  --transport stdio \\`);
    console.log(`  --scope user \\`);
    console.log(`  --env GOOGLE_GENAI_USE_VERTEXAI=true \\`);
    console.log(`  --env GOOGLE_CLOUD_PROJECT=your-project-id \\`);
    console.log(`  --env GOOGLE_CLOUD_LOCATION=asia-northeast3 \\`);
    console.log(`  ${serverCmd}`);
  }

  console.log('\n─────────────────────────────────────────────────');
  console.log('After registering, verify with: /mcp in Claude Code');

  if (existsSync(join(process.cwd(), '.gemini-ui-config.json'))) {
    console.log('\n✅ Found .gemini-ui-config.json in current directory');
  } else {
    console.log('\n💡 Optional: add project design context');
    console.log(
      `   cp .gemini-ui-config.example.json .gemini-ui-config.json`
    );
    console.log(`   (then edit .gemini-ui-config.json for your project)`);
  }
}

export function runInstall(args: string[]) {
  const isProject = args.includes('--project');
  const vertexOnly = args.includes('--vertex');
  const aiStudioOnly = args.includes('--aistudio');
  const mode = vertexOnly ? 'vertex' : aiStudioOnly ? 'aistudio' : 'both';
  const targetDir = isProject ? 'project' : 'user';

  console.log(`\nInstalling ${PACKAGE_NAME}...`);

  // Install skill file
  try {
    const destPath = installSkill(targetDir);
    console.log(`✅ Skill installed: ${destPath}`);
    console.log(`   Use with: /gemini-ui in Claude Code`);
  } catch (err) {
    console.error(`❌ Failed to install skill: ${err}`);
    process.exit(1);
  }

  // Print MCP registration instructions
  printMcpInstructions(mode);

  console.log('\nSetup complete! 🎉\n');
}
