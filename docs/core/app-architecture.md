---
name: windows15-app-architecture
description: How Windows 15 apps are registered, lazy-loaded, and launched as windows.
load_when: You need to add a new app, wire an app into the OS, or debug why an app won’t open.
---

# App Architecture

## The canonical app registry

Windows 15 apps are registered in `apps/registry.ts` via `APP_REGISTRY`.

Each entry defines:

- `id`: stable identifier (used by `openWindow(appId)`)
- `title`: window title + menus
- `icon`: Material Symbols name (string)
- `color`: Tailwind class (e.g. `bg-orange-400`)
- `component`: lazy-loaded React component
- `defaultWidth` / `defaultHeight`: initial size (optional)

### Minimal registry entry

```ts
{
  id: 'calculator',
  title: 'Calculator',
  icon: 'calculate',
  color: 'bg-orange-400',
  component: React.lazy(() => import('./Calculator').then(m => ({ default: m.Calculator }))),
  defaultWidth: 320,
  defaultHeight: 480,
}
```

## Lazy loading and code-splitting

Apps are typically declared like:

```ts
component: React.lazy(() => import('./MyApp').then(m => ({ default: m.MyApp })));
```

This keeps the initial bundle smaller and defers loading until the app is opened.

## How apps get launched

The runtime flow is:

1. User action (desktop icon / start menu) calls `openWindow(appId)`.
2. `context/WindowContext.tsx` creates (or re-focuses) a `WindowState`.
3. `WindowState.component` is set to `<app.component {...contentProps} />`.
4. `components/Window.tsx` renders the window chrome and mounts the app content.

## Passing props into apps (`contentProps`)

`openWindow(appId, contentProps?)` allows passing props to the app component.

- If the app is already open, calling `openWindow` will _re-focus_ the existing window and optionally replace `component` when `contentProps` is provided.
- If the app is not open, a new window is created using the props.

This supports patterns like “open Notepad with this file selected”.

## Where _not_ to register apps

- Don’t register apps in ad-hoc places.
- Prefer `apps/registry.ts` so Start Menu, desktop icons, and session restore all stay consistent.

## Common pitfalls

- **Mismatched export name**: the registry import expects the component export (`m.MyApp`).
- **Changing `id` breaks restore**: window/session restore uses `appId` strings; keep them stable.
- **Tailwind class drift**: `color` should be a class that exists in this codebase; match existing patterns.

## Next

- Window lifecycle & persistence: `core/window-lifecycle.md`
- “Create a new app” walkthrough: `guides/creating-simple-app.md`
