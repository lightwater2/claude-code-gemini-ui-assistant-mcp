# claude-code-gemini-ui-assistant-mcp

> MCP server for collaborative UI generation: **Claude orchestrates, Gemini generates components**.
> Claude handles page structure, routing, and integration. Gemini generates high-quality, design-consistent component code.
>
> **v2.0**: Now supports component sets (batch generation with design consistency) and screenshot-to-code (multimodal vision).

## Collaboration Model

```
User: "Make a payment page"

Claude (orchestrator):
  1. Reads existing code, identifies required components
  2. Defines component specs (name, description, props)
  3. ─── Gemini call ───────────────────────────────
     gemini_generate_component_set({
       pageContext: "Payment page with card input + order summary + button",
       components: [
         { name: "CardInputForm", description: "..." },
         { name: "OrderSummary", description: "..." },
         { name: "PaymentButton", description: "..." }
       ]
     })
  4. ─── Receives JSON ──────────────────────────────
     { components: [{ name, code }, ...] }
  5. Creates each component at the correct file path
  6. Writes the page file (Claude does this directly)
  7. Wires imports, registers route
```

**Core principle**: Claude decides *what*, *where*, and *how to assemble*. Gemini handles *component code generation* only.

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

## MCP Tools (5 tools)

### `gemini_generate_component`

Generate a single UI component from scratch. Stack-agnostic (React, Vue, Svelte, plain HTML, etc.).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | ✅ | Component name in PascalCase |
| `description` | string | ✅ | What the component does |
| `props` | string | | Props / parameters description |
| `designNotes` | string | | Stack, colors, layout, visual requirements |
| `references` | string | | Existing code to reference for patterns |
| `layer` | enum | | FSD layer: `shared`/`entities`/`features`/`widgets` |

### `gemini_generate_component_set` ⭐ NEW

Generate multiple components as a **cohesive, design-consistent set** in one Gemini call. Unlike calling `generate_component` repeatedly, all components share the same context — guaranteeing consistent colors, spacing, and typography.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pageContext` | string | ✅ | Page/screen description for design cohesion |
| `components` | string | ✅ | JSON array: `[{ name, description, props? }]` |
| `designNotes` | string | | Shared design requirements for all components |
| `references` | string | | Existing code for pattern/style matching |

Returns JSON: `{ "components": [{ "name": "...", "code": "..." }] }`

### `gemini_screenshot_to_code` ⭐ NEW

Send a screenshot or design image to Gemini Vision and receive UI code. Analyzes layout, colors, typography, and interactive elements.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `imageBase64` | string | ✅ | Base64-encoded image (PNG/JPG/WebP) |
| `mimeType` | enum | | `image/png` / `image/jpeg` / `image/webp` (default: `image/png`) |
| `description` | string | | Screenshot description and code generation intent |
| `outputType` | enum | | `component` / `page` / `styles` (default: `component`) |
| `designNotes` | string | | Stack, framework, design system constraints |
| `references` | string | | Existing code patterns to match |

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

Returns: numbered list of actionable improvements (hardcoded values, missing a11y, inconsistencies).

---

## Skill: `/gemini-ui`

Installing this package also registers a `/gemini-ui` skill in Claude Code. When invoked, it provides Claude with a **step-by-step orchestration guide**:

- **Step 1 (Claude)**: Analyze existing code, identify required components, define specs
- **Step 2 (Gemini)**: Generate components via `generate_component` or `generate_component_set`
- **Step 3 (Claude)**: Place files at correct paths, write page file directly, wire imports and routing
- **Step 4 (Claude)**: Optional review with `review_design`, refinement with `modify_component`

Tool selection guide:
- 1 component → `gemini_generate_component`
- 2+ components needing design consistency → `gemini_generate_component_set`
- Design image → `gemini_screenshot_to_code`

---

## Project-Specific Configuration

Place a `.gemini-ui-config.json` in your project root to inject design system context into every Gemini call automatically — no need to repeat it in `designNotes` each time.

```bash
curl -o .gemini-ui-config.json https://raw.githubusercontent.com/lightwater2/claude-code-gemini-ui-assistant-mcp/main/.gemini-ui-config.example.json
```

```json
{
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

If no config file is found, the server uses no project context and Gemini defaults to plain HTML + vanilla JS + CSS.

---

## Recommended CLAUDE.md Setup

To make the `/gemini-ui` skill trigger automatically on frontend tasks — without having to invoke it manually every time — add the following to your project's `CLAUDE.md`:

````markdown
## UI Component Development

When implementing UI components or frontend features, use the `gemini_generate_component`,
`gemini_modify_component`, and `gemini_review_design` MCP tools to delegate component
code generation to Gemini. Claude focuses on page structure, file placement, imports,
routing, and orchestration.

### Frontend Stack

<!-- Customize this for your project -->
- Framework: React 18 + TypeScript
- Styling: Tailwind CSS with design tokens
- Units: rem only (use pxToRem utility)
- Imports: absolute paths with @/ prefix
- State: Zustand
- Data fetching: TanStack React Query v5

Always pass the stack and relevant conventions through `designNotes` when calling Gemini tools.
````

**Why this works:** Claude reads `CLAUDE.md` at session start. With explicit instructions to use Gemini tools for UI work, Claude will automatically delegate component generation without needing `/gemini-ui` to be invoked manually.

### Stack Examples

<details>
<summary>Vue 3 + Vite</summary>

```markdown
### Frontend Stack
- Framework: Vue 3 (Composition API) + TypeScript
- Styling: UnoCSS
- State: Pinia
- Data fetching: VueUse + native fetch
```

</details>

<details>
<summary>Svelte 5</summary>

```markdown
### Frontend Stack
- Framework: Svelte 5 (runes)
- Styling: CSS Modules
- State: Svelte stores
```

</details>

<details>
<summary>No framework (plain HTML/JS)</summary>

```markdown
### Frontend Stack
- Plain HTML + vanilla JavaScript (ES2020+)
- CSS with custom properties
- No build tools, no frameworks
```

</details>

If no stack is specified anywhere, Gemini defaults to **plain HTML + vanilla JS + CSS**.

---

## Example Workflows

### Single component

```
User: "Add a product card to the listing page"

Claude:
  1. Reads existing card components for patterns
  2. Calls gemini_generate_component({
       name: "ProductCard",
       description: "Displays product image, name, price, and add-to-cart button",
       props: "name, price, imageUrl, onAddToCart",
       designNotes: "React + TypeScript + Tailwind, rounded-2xl, shadow-sm",
       references: "<existing card component>",
       layer: "entities"
     })
  3. Places at src/entities/product/ui/ProductCard.tsx
  4. Wires imports and page integration
```

### Multiple components (design-consistent set)

```
User: "Build a checkout page"

Claude:
  1. Designs page structure (3 sections needed)
  2. Calls gemini_generate_component_set({
       pageContext: "Checkout page: shipping form + order review + place-order button",
       components: JSON.stringify([
         { name: "ShippingForm", description: "Address + delivery method inputs" },
         { name: "OrderReview", description: "Line items + subtotal + tax + total" },
         { name: "PlaceOrderButton", description: "CTA button with loading state" }
       ]),
       designNotes: "React + TypeScript + Tailwind, clean minimal style",
       references: "<existing form component>"
     })
  3. Parses JSON → creates 3 files at correct FSD paths
  4. Writes CheckoutPage.tsx directly (imports all 3, adds routing)
```

### Screenshot to code

```
User: (shares Figma screenshot of a modal dialog)

Claude:
  1. Reads image as base64
  2. Calls gemini_screenshot_to_code({
       imageBase64: "<base64>",
       description: "Figma screenshot of subscription upgrade modal",
       outputType: "component",
       designNotes: "React + TypeScript + Tailwind CSS"
     })
  3. Receives initial code, refines with project conventions
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
