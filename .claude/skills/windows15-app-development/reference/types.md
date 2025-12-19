---
name: windows15-reference-types
description: Shared type reference for Windows 15 apps.
load_when: You need to understand shared shapes like WindowState, FileSystemItem, or app config types.
---

# Types Reference

Types are primarily defined in `types.ts`.

## Windowing

- `WindowState` — shape stored in `WindowContext` and rendered by `components/Window.tsx`.

Key fields:

- `id`, `appId`
- `title`, `icon`
- `isMinimized`, `isMaximized`, `zIndex`
- `position: {x,y}`, `size: {width,height}`

## File system

- `FileSystemItem` — used by file-related components (Explorer, Recycle Bin, etc.).

It supports:

- folder trees (`children`)
- content-backed docs (`content`)
- media (`src`)
- recycle-bin metadata (`deletedAt`, `deletedFrom`)
- shortcuts (`appId`, `targetPath`, `icon`, `colorClass`)

## App configuration types (important nuance)

There are _two_ `AppConfig` shapes you’ll see:

1. `apps/registry.ts` defines the **runtime registry** `AppConfig` that uses a **lazy component** (`React.lazy`).
2. `types.ts` also exports an `AppConfig` interface with a different `component` shape.

When adding or modifying actual apps in the OS, treat `apps/registry.ts` and its exported `APP_REGISTRY` as the authoritative integration point.

## Next

- App registry guide: `core/app-architecture.md`
