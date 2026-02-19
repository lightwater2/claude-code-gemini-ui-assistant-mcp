# Gemini UI Component Assistant

When implementing UI features, delegate individual component generation to Gemini via MCP tools. This creates a clear role separation:

- **Claude**: page structure design, file placement, imports, routing, state management, orchestration
- **Gemini**: individual component code generation

## When to Use

Use `gemini_generate_component` when you need to create a new React component:

```
gemini_generate_component({
  name: "ComponentName",          // PascalCase
  description: "what it does",    // functionality description
  props: "prop1: type, ...",      // optional: props interface
  designNotes: "visual details",  // optional: colors, layout, spacing
  references: "existing code",    // optional: paste similar components for patterns
  layer: "shared|entities|features|widgets"  // optional: FSD layer
})
```

Use `gemini_modify_component` when modifying existing code:

```
gemini_modify_component({
  code: "<full component code>",
  instruction: "what to change",
  designNotes: "constraints to maintain"  // optional
})
```

Use `gemini_review_design` to check design quality before finalizing:

```
gemini_review_design({
  code: "<component code>",
  context: "screen and purpose description"  // optional
})
```

## Workflow

1. Read relevant existing components to understand project patterns
2. Identify which components need to be created or modified
3. Call the appropriate Gemini tool with rich context (references help a lot)
4. Receive the generated code
5. Place the file in the correct FSD layer path
6. Wire up imports and integrate into the page

## Tips

- Pass `references` containing similar existing components — Gemini will match patterns
- Be specific in `designNotes`: mention exact colors, spacing, border radius
- For multi-component tasks, call Gemini once per component (single responsibility)
- If the result doesn't match expectations, use `gemini_modify_component` to refine
