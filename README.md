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

## Installation

### Prerequisites

- Node.js 18+
- Claude Code CLI
- Google AI Studio API key **or** Google Cloud project with Vertex AI

### Quick Install

Run in any terminal (outside Claude Code):

```bash
npx claude-code-gemini-ui-assistant-mcp install
```

**What happens:**
1. Installs `/gemini-ui` skill to `~/.claude/skills/gemini-ui/` (available in all projects)
2. Prompts for your Gemini API key — input is masked with `*` per keystroke, paste works
3. Validates the key with a live Gemini API call
4. Runs `claude mcp add gemini-ui` automatically — server appears in `/mcp` immediately

### Install Options

```bash
# Pass API key directly (skips interactive prompt)
npx claude-code-gemini-ui-assistant-mcp install --api-key=AIzaSy...
npx claude-code-gemini-ui-assistant-mcp install --api-key AIzaSy...

# Use environment variable (also skips prompt)
GEMINI_API_KEY=AIzaSy... npx claude-code-gemini-ui-assistant-mcp install

# Install skill to project level instead of user level
npx claude-code-gemini-ui-assistant-mcp install --project

# Combine flags
npx claude-code-gemini-ui-assistant-mcp install --api-key=AIzaSy... --project
```

**Key resolution priority:** `--api-key` arg → `GEMINI_API_KEY` env → interactive prompt

### Running Inside Claude Code

If you run `install` inside a Claude Code session, auto-registration is not possible (nested CLI sessions are blocked). The installer detects this and prints the exact command — with your API key already filled in — to run in a new terminal:

```
⚠️  Running inside Claude Code — cannot auto-register.

  Run this in a new terminal:

  claude mcp add gemini-ui \
    --transport stdio \
    --scope user \
    --env GEMINI_API_KEY=AIzaSy... \
    -- npx -y claude-code-gemini-ui-assistant-mcp
```

### Uninstall

```bash
npx claude-code-gemini-ui-assistant-mcp uninstall
```

Removes the skill directory and unregisters the MCP server. To reinstall, run `install` again.

### Manual Registration (Vertex AI)

For Vertex AI instead of AI Studio:

```bash
claude mcp add gemini-ui \
  --transport stdio \
  --scope user \
  --env GOOGLE_GENAI_USE_VERTEXAI=true \
  --env GOOGLE_CLOUD_PROJECT=your-project-id \
  --env GOOGLE_CLOUD_LOCATION=us-central1 \
  -- npx -y claude-code-gemini-ui-assistant-mcp
```

For Service Account auth, add:
```bash
--env GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

Verify: run `/mcp` inside Claude Code — `gemini-ui` should appear as active.

---

## MCP Tools

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

Returns: numbered list of actionable improvements (hardcoded colors/px, missing a11y, inconsistencies).

---

## Skill: `/gemini-ui`

Installing this package also registers a `/gemini-ui` skill in Claude Code. When invoked, it instructs Claude to:

- Delegate individual component generation to Gemini via the MCP tools
- Focus Claude on page structure, file placement, imports, routing, and orchestration
- Use `references` to pass existing components so Gemini matches your project's patterns

---

## Project-Specific Configuration

Copy the example config to your project root:

```bash
cp node_modules/claude-code-gemini-ui-assistant-mcp/.gemini-ui-config.example.json .gemini-ui-config.json
# or download directly:
curl -o .gemini-ui-config.json https://raw.githubusercontent.com/lightwater2/claude-code-gemini-ui-assistant-mcp/main/.gemini-ui-config.example.json
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

Point to a custom path via environment variable when registering the MCP server:

```bash
--env GEMINI_UI_CONFIG=/path/to/.gemini-ui-config.json
```

If no config file is found, the server runs in generic React + Tailwind mode.

---

## Model

This package uses **`gemini-3.1-pro-preview`** exclusively. The model is hardcoded and not configurable.

---

## Example Workflow

```
User: "Add a compatibility result card to the chat page"

Claude:
  1. Reads Chat.tsx and related components
  2. Identifies: CompatibilityResultCard needed
  3. Calls gemini_generate_component({
       name: "CompatibilityResultCard",
       description: "Displays two saju compatibility score visually",
       props: "score: number, elements: ElementMatch[], label: string",
       designNotes: "rounded-2xl card, shadow-sm, element colors",
       references: "<existing card component code>",
       layer: "entities"
     })
  4. Receives component code from Gemini
  5. Places at src/entities/compatibility/ui/CompatibilityResultCard.tsx
  6. Wires up imports and page integration
```

---

## Environment Variables Reference

| Variable | Description | Required For |
|----------|-------------|-------------|
| `GEMINI_API_KEY` | Google AI Studio API key | AI Studio mode |
| `GOOGLE_GENAI_USE_VERTEXAI` | Set to `true` for Vertex AI | Vertex AI mode |
| `GOOGLE_CLOUD_PROJECT` | GCP project ID | Vertex AI mode |
| `GOOGLE_CLOUD_LOCATION` | GCP region (default: `us-central1`) | Vertex AI mode |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON | Vertex AI + SA auth |
| `GEMINI_UI_CONFIG` | Path to `.gemini-ui-config.json` | Custom config path |

---

## License

MIT © [lightwater2](https://github.com/lightwater2)
