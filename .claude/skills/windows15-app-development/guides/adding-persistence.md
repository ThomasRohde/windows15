---
name: windows15-guide-persistence
description: Persist app state using the repo’s preferred patterns (Dexie/IndexedDB via hooks).
load_when: You’re adding saved settings, history, drafts, or any state that must survive refresh.
---

# Guide: Add Persistence

## Preferred option: `usePersistedState()`

Use `usePersistedState()` (from `hooks/usePersistedState.ts`) to persist React state to IndexedDB via Dexie.

Example:

```tsx
import React from 'react';
import { usePersistedState } from '../hooks';

type Settings = { darkMode: boolean };

export function MyApp() {
    const {
        value: settings,
        setValue: setSettings,
        isLoading,
    } = usePersistedState<Settings>('myapp.settings', {
        darkMode: false,
    });

    if (isLoading) return <div>Loading…</div>;

    return <button onClick={() => setSettings({ ...settings, darkMode: !settings.darkMode })}>Toggle</button>;
}
```

Guidelines:

- Choose a stable key namespace like `myapp.*`.
- Keep persisted payloads small and JSON-serializable.

## When to use `useLocalStorage()` instead

Use `useLocalStorage()` only for non-critical state where IndexedDB is unnecessary.

## Deeper repo notes

This guide is intentionally short; the existing doc has more discussion:

- See `docs/state-persistence.md`.

## Troubleshooting

- If state never loads, check for IndexedDB errors in console.
- If the UI “jumps” on load, render a loading state while `isLoading` is true.

## Next

- Hook reference: `reference/hooks.md`
