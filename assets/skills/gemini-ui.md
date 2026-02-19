---
name: gemini-ui
description: UI 컴포넌트 구현 시 Gemini에게 위임. Claude는 페이지 구조·배치·오케스트레이션, Gemini는 컴포넌트 코드 생성에 집중.
allowed-tools: Read, Glob, Grep, Edit, Write
---

# Gemini UI Component Assistant

When implementing UI components, delegate individual component generation to Gemini via MCP tools.

**Role separation:**
- **Claude**: page structure, file placement, imports, routing, state management, orchestration
- **Gemini**: individual component code generation

## Stack

Use the frontend stack and conventions defined in this project's CLAUDE.md or context.
Pass the stack information through `designNotes` or `references` when calling Gemini tools.
If no stack is specified, Gemini defaults to plain HTML + vanilla JS + CSS.

## When to Use

Use `gemini_generate_component` to create a new component:

```
gemini_generate_component({
  name: "ComponentName",
  description: "what it does",
  props: "prop1: type, ...",           // optional
  designNotes: "stack + visual notes", // specify stack here if needed
  references: "existing code",         // paste similar components for pattern matching
  layer: "shared|entities|features|widgets"  // optional: FSD layer
})
```

Use `gemini_modify_component` to modify existing code:

```
gemini_modify_component({
  code: "<full component code>",
  instruction: "what to change",
  designNotes: "constraints to maintain"
})
```

Use `gemini_review_design` to check design quality:

```
gemini_review_design({
  code: "<component code>",
  context: "screen and purpose"
})
```

## Workflow

1. Read relevant existing components to understand patterns
2. Identify which components need to be created or modified
3. Call the appropriate Gemini tool — pass `references` with similar code for best results
4. Place the returned code at the correct path
5. Wire up imports and integrate into the page

## Tips

- Always include stack info in `designNotes` if the project uses a specific framework
- Pass `references` with existing similar components — Gemini matches patterns precisely
- For multi-component tasks, call Gemini once per component
- If output doesn't match, use `gemini_modify_component` to refine
