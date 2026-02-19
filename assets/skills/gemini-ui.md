---
name: gemini-ui
description: UI 구현 시 개별 컴포넌트를 Gemini에게 위임. Claude는 페이지 구조·배치·오케스트레이션, Gemini는 컴포넌트 코드 생성에 집중.
allowed-tools: Read, Glob, Grep, Edit, Write
---

# Gemini UI Component Assistant

When implementing UI features, delegate individual component generation to Gemini via MCP tools.

**Role separation:**
- **Claude**: page structure design, file placement, imports, routing, state management, orchestration
- **Gemini**: individual component code generation

## When to Use

Use `gemini_generate_component` to create a new React component:

```
gemini_generate_component({
  name: "ComponentName",          // PascalCase
  description: "what it does",
  props: "prop1: type, ...",      // optional
  designNotes: "colors, layout",  // optional
  references: "existing code",    // optional — paste similar components for pattern matching
  layer: "shared|entities|features|widgets"  // optional: FSD layer
})
```

Use `gemini_modify_component` to modify existing code:

```
gemini_modify_component({
  code: "<full component code>",
  instruction: "what to change",
  designNotes: "constraints to maintain"  // optional
})
```

Use `gemini_review_design` to check design quality:

```
gemini_review_design({
  code: "<component code>",
  context: "screen and purpose"  // optional
})
```

## Workflow

1. Read relevant existing components to understand patterns
2. Identify which components need to be created or modified
3. Call the appropriate Gemini tool with rich context (`references` helps a lot)
4. Place the returned code at the correct FSD layer path
5. Wire up imports and integrate into the page

## Tips

- Pass `references` with similar existing components — Gemini matches patterns precisely
- Be specific in `designNotes`: exact colors, spacing, border radius
- For multi-component tasks, call Gemini once per component
- If output doesn't match, use `gemini_modify_component` to refine
