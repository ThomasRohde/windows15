---
description: Windows 15 app development guide (progressive loading for coding agents)
---

# Windows 15 App Development Guide

This guide is structured for **progressive loading**: start small, then pull in deeper docs only when needed.

## Start here

- Read `docs/SKILL.md` first. It’s the routing page that points you to the right next file.

## Progressive loading map

- **Level 1: routing**
    - `docs/SKILL.md`

- **Level 2: core architecture (almost always relevant)**
    - `core/app-architecture.md`
    - `core/window-lifecycle.md`
    - `core/state-management.md`

- **Level 3: task guides (load when doing a specific task)**
    - `guides/creating-simple-app.md`
    - `guides/adding-persistence.md`
    - `guides/hotkeys.md`
    - `guides/notifications.md`
    - `guides/styling-patterns.md`

- **Level 3: references (load for lookup / debugging)**
    - `reference/contexts.md`
    - `reference/hooks.md`
    - `reference/ui-components.md`
    - `reference/types.md`

- **Level 3: examples (load to mimic a known-good pattern)**
    - `examples/calculator-walkthrough.md`
    - `examples/notepad-walkthrough.md`

## Existing docs you should still use

This repo already has high-value docs that are intentionally kept as-is:

- `docs/keyboard-shortcuts.md` (complete shortcuts catalog)
- `docs/state-persistence.md` (persistence strategy notes)
- `docs/api/` (TypeDoc output)

The new guide links to these where relevant.

## Quick “agent prompts” that map cleanly to this guide

- “Add a new app called X” → `guides/creating-simple-app.md`
- “Why doesn’t my window reopen after refresh?” → `core/window-lifecycle.md`
- “How do I persist settings?” → `guides/adding-persistence.md`
- “Add Ctrl+S to my app” → `guides/hotkeys.md`
- “Show a toast when saved” → `guides/notifications.md`
- “What components exist for forms/layout?” → `reference/ui-components.md`
