---
name: windows15-guide-create-app
description: Step-by-step guide to add a new app to Windows 15.
load_when: You’re implementing a new app under apps/ and need it to show up and open.
---

# Guide: Create a Simple App

This guide adds a minimal app and registers it so it can be launched as a window.

## Checklist

- Create app component file in `apps/`
- Add app entry to `apps/registry.ts`
- Verify it opens via Start Menu/desktop

## Step 1: Create the app component

Create `apps/MyApp.tsx`:

```tsx
import React from 'react';
import { AppContainer } from '../components/ui/AppContainer';

export function MyApp() {
    return (
        <AppContainer padding>
            <h1 className="text-lg font-semibold">My App</h1>
            <p className="text-sm opacity-80">Hello from Windows 15.</p>
        </AppContainer>
    );
}
```

Notes:

- Use `AppContainer` for consistent spacing.
- Prefer existing Tailwind tokens/classes already used throughout the repo.

## Step 2: Register the app

Add an entry to `apps/registry.ts` (pick a stable `id`):

```ts
{
  id: 'myapp',
  title: 'My App',
  icon: 'apps',
  color: 'bg-slate-400',
  component: React.lazy(() => import('./MyApp').then(m => ({ default: m.MyApp }))),
  defaultWidth: 520,
  defaultHeight: 420,
}
```

## Step 3: Validate it launches

- Use whatever UI launches apps in this repo (start menu / desktop icon).
- Confirm the window opens and the title/icon look correct.

If it fails to open:

- ensure the export name matches (`m.MyApp`)
- check the browser console for runtime errors
- confirm the `id` is unique

## Step 4 (optional): Add persistence, hotkeys, notifications

- Persist state: `guides/adding-persistence.md`
- Hotkeys: `guides/hotkeys.md`
- Notifications: `guides/notifications.md`

## Next

- Architecture background: `core/app-architecture.md`
- UI building blocks: `reference/ui-components.md`
