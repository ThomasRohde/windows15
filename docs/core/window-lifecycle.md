---
name: windows15-window-lifecycle
description: Window creation, focusing, minimizing/maximizing, sizing, and session restore.
load_when: You need to open/close windows, debug z-index/focus, or understand persistence/restore.
---

# Window Lifecycle

## The source of truth

Window state is managed by `context/WindowContext.tsx` and rendered by `components/Window.tsx`.

You can access window APIs via either:

- `useWindowManager()` (direct)
- `useOS()` (compat wrapper that re-exports window APIs)

## WindowManager API (high-level)

`useWindowManager()` provides:

- `windows`: list of open `WindowState`
- `openWindow(appId, contentProps?)`
- `closeWindow(windowId)`
- `minimizeWindow(windowId)`
- `toggleMaximizeWindow(windowId)`
- `focusWindow(windowId)`
- `resizeWindow(windowId, size, position?)`
- `updateWindowPosition(windowId, position)`

## Opening windows (and the “single instance per app” rule)

`openWindow(appId)` enforces _one window per appId_.

- If a window for that `appId` already exists, it is restored from minimized and brought to front (z-index bumped).
- If no window exists, a new `WindowState` is created.

This matters when designing apps: if you need multiple instances, you’ll need a different pattern than `appId`-based singleton windows.

## Initial size and position

When opening a new window:

- Size defaults to `app.defaultWidth/defaultHeight` from `apps/registry.ts`, falling back to `800x600`.
- Position defaults to a cascading offset so multiple windows don’t stack perfectly.

## Session restore and persistence

On startup, `WindowProvider`:

- reads saved window geometry and open apps via `storageService`
- restores windows for saved open `appId`s

When window lists or geometry changes, it persists:

- `windowStates` (position/size per appId)
- `openWindows` (list of open appIds)

If session restore “doesn’t work”, check:

- the app exists in the registry with the same `id`
- storage keys are present (`windows15.os.*`)
- the app component renders without throwing

## Rendering: where Suspense and errors go

`components/Window.tsx` wraps app rendering with:

- `Suspense` (app loading skeleton)
- `ErrorBoundary` (app crash isolation)

This keeps the OS responsive even if one app fails.

## Next

- State and contexts overview: `core/state-management.md`
- If you need to persist app data: `guides/adding-persistence.md`
