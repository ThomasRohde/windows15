---
name: windows15-app-development
description: Progressive-loading development guide for building Windows 15 apps in this repo.
audience: coding-agents
version: 1

# Progressive loading
# - Level 1 (this file): fast orientation + routing
# - Level 2 (core/*): architecture you almost always need
# - Level 3 (guides/*, reference/*, examples/*): task-specific depth
---

# Windows 15 App Development (Skill)

Use this documentation set to build or modify apps under `apps/` in the Windows 15 desktop environment.

## How to use (progressive loading)

1. Start here to decide what to load next.
2. If you’re building or wiring an app: read `core/app-architecture.md`.
3. If you’re touching window behaviors: read `core/window-lifecycle.md`.
4. If you’re looking up an API quickly: jump to `reference/*`.

## Routing (pick the next file)

- **Create a new app** → `guides/creating-simple-app.md`
- **Register an app / app config** → `core/app-architecture.md`
- **Open/focus/minimize windows** → `core/window-lifecycle.md`
- **Persist app state (IndexedDB/Dexie)** → `guides/adding-persistence.md` and `docs/state-persistence.md`
- **Keyboard shortcuts** → `guides/hotkeys.md` and `docs/keyboard-shortcuts.md`
- **Toast notifications** → `guides/notifications.md`
- **UI components & styling** → `guides/styling-patterns.md` and `reference/ui-components.md`
- **Full API lookup** → `reference/contexts.md`, `reference/hooks.md`, `reference/types.md`
- **Learn by example** → `examples/calculator-walkthrough.md`, `examples/notepad-walkthrough.md`

## Repo landmarks

- App registration: `apps/registry.ts` (authoritative app registry used at runtime)
- Window lifecycle: `context/WindowContext.tsx` and `components/Window.tsx`
- OS wrapper hook: `context/OSContext.tsx` (`useOS()`)
- Common hooks: `hooks/index.ts`
- UI primitives: `components/ui/`

## Constraints (keep agents honest)

- Prefer existing UI primitives in `components/ui/`.
- Prefer persistence via `usePersistedState()` (Dexie-backed) unless there’s a reason to stay in localStorage.
- Don’t invent new global patterns when an existing hook/context already solves it.

## Index

- `docs/README.md` (human + agent-friendly index)
- `core/`
    - `core/app-architecture.md`
    - `core/window-lifecycle.md`
    - `core/state-management.md`
- `guides/`
    - `guides/creating-simple-app.md`
    - `guides/adding-persistence.md`
    - `guides/hotkeys.md`
    - `guides/notifications.md`
    - `guides/styling-patterns.md`
- `reference/`
    - `reference/contexts.md`
    - `reference/hooks.md`
    - `reference/ui-components.md`
    - `reference/types.md`
- `examples/`
    - `examples/calculator-walkthrough.md`
    - `examples/notepad-walkthrough.md`
