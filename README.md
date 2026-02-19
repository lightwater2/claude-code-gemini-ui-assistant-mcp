# claude-code-gemini-ui-assistant-mcp

> MCP server that delegates React component generation to Gemini from Claude Code.
> **Role separation**: Claude handles page structure, routing, and orchestration. Gemini focuses on individual component code generation.

## How It Works

```
User Request → Claude (orchestrator)
                ├── Reads existing code
                ├── Identifies components needed
                ├── Calls gemini_generate_component → Gemini
                │                                     (generates component code)
                └── Integrates result into project
```

Claude thinks about architecture. Gemini writes the component. You get the best of both.

## Tools

### `gemini_generate_component`

Generate a new React TypeScript component from scratch.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | ✅ | PascalCase component name |
| `description` | string | ✅ | What the component does |
| `props` | string | | Props interface description |
| `designNotes` | string | | Colors, layout, visual requirements |
| `references` | string | | Existing code to reference for patterns |
| `layer` | enum | | FSD layer: `shared`/`entities`/`features`/`widgets` |

### `gemini_modify_component`

Pass existing component code and get back a modified version.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | ✅ | Current component code (full) |
| `instruction` | string | ✅ | What to change |
| `designNotes` | string | | Design constraints to maintain |

### `gemini_review_design`

Review a component for design quality issues.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | ✅ | Component code to review |
| `context` | string | | Component purpose and screen context |

Returns: numbered list of specific, actionable improvements (hardcoded values, missing a11y, inconsistencies).

## Installation

### Prerequisites

- Node.js 18+
- Claude Code CLI
- Google AI Studio API key **or** Google Cloud project with Vertex AI

### One-Command Install (Recommended)

Run this in your project directory (or anywhere — defaults to user-level install):

```bash
npx claude-code-gemini-ui-assistant-mcp install
```

This will:
1. Copy the `/gemini-ui` skill to `~/.claude/skills/gemini-ui.md`
2. Print the `claude mcp add` command to register the MCP server

Then run the printed `claude mcp add` command in your terminal.

**Options:**

```bash
# User-level skill (default, works in all projects)
npx claude-code-gemini-ui-assistant-mcp install

# Project-level skill only (creates .claude/skills/ in current dir)
npx claude-code-gemini-ui-assistant-mcp install --project

# Show only Vertex AI instructions
npx claude-code-gemini-ui-assistant-mcp install --vertex

# Show only AI Studio instructions
npx claude-code-gemini-ui-assistant-mcp install --aistudio
```

### Manual Registration

If you prefer to register without the installer:

**Option A: Google AI Studio (API Key)**

```bash
claude mcp add gemini-ui \
  --transport stdio \
  --scope user \
  --env GEMINI_API_KEY=your-api-key-here \
  -- npx -y claude-code-gemini-ui-assistant-mcp
```

**Option B: Vertex AI (ADC / Service Account)**

```bash
claude mcp add gemini-ui \
  --transport stdio \
  --scope user \
  --env GOOGLE_GENAI_USE_VERTEXAI=true \
  --env GOOGLE_CLOUD_PROJECT=your-project-id \
  --env GOOGLE_CLOUD_LOCATION=asia-northeast3 \
  -- npx -y claude-code-gemini-ui-assistant-mcp
```

For Service Account auth, also set:
```bash
--env GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

Verify registration:
```bash
# In Claude Code
/mcp
# Should show gemini-ui as active
```

## Project-Specific Configuration

Copy the example config to your project root and customize:

```bash
cp .gemini-ui-config.example.json /your/project/.gemini-ui-config.json
```

```json
{
  "model": "gemini-2.5-flash",
  "designContext": "Your design system description...",
  "conventions": {
    "styling": "Tailwind CSS with design tokens",
    "units": "rem only",
    "imports": "absolute paths with @/ prefix",
    "stateManagement": "Zustand",
    "dataFetching": "TanStack React Query"
  },
  "componentPatterns": {
    "shared": "src/shared/ui/{name}/",
    "features": "src/features/{name}/ui/",
    "entities": "src/entities/{name}/ui/",
    "widgets": "src/widgets/{name}/"
  }
}
```

Point to a custom config file via environment variable:

```bash
--env GEMINI_UI_CONFIG=/path/to/.gemini-ui-config.json
```

If no config file is found, the server operates in generic React + Tailwind mode.

## Supported Models

Any Gemini model available in your chosen backend:

| Model | Notes |
|-------|-------|
| `gemini-2.5-flash` | Recommended — fast, capable, cost-effective |
| `gemini-2.5-pro` | Higher quality, slower |
| `gemini-2.0-flash` | Stable alternative |

Set the model in `.gemini-ui-config.json` or it defaults to `gemini-2.5-flash`.

## Example Workflow

```
User: "채팅 페이지에 사주 궁합 결과 카드를 추가해줘"

Claude:
  1. Reads Chat.tsx and related components
  2. Identifies: CompatibilityResultCard needed
  3. Calls gemini_generate_component({
       name: "CompatibilityResultCard",
       description: "두 사주의 궁합 결과를 시각적으로 표시하는 카드",
       props: "score: number, elements: ElementMatch[], label: string",
       designNotes: "오행 색상 사용, rounded-2xl 카드, shadow-sm",
       layer: "entities"
     })
  4. Receives component code from Gemini
  5. Places at src/entities/compatibility/ui/CompatibilityResultCard.tsx
  6. Wires up imports and page integration
```

## Environment Variables Reference

| Variable | Description | Required For |
|----------|-------------|-------------|
| `GEMINI_API_KEY` | Google AI Studio API key | AI Studio mode |
| `GOOGLE_GENAI_USE_VERTEXAI` | Set to `true` for Vertex AI | Vertex AI mode |
| `GOOGLE_CLOUD_PROJECT` | GCP project ID | Vertex AI mode |
| `GOOGLE_CLOUD_LOCATION` | GCP region (default: `us-central1`) | Vertex AI mode |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON | Vertex AI + SA auth |
| `GEMINI_UI_CONFIG` | Path to `.gemini-ui-config.json` | Custom config path |

## License

MIT © OneTherapy
