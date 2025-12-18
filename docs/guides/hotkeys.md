---
name: windows15-guide-hotkeys
description: Add keyboard shortcuts in an app using the repo’s hotkey hooks.
load_when: You need Ctrl+S/Ctrl+F/etc. in an app, or to understand shortcut labeling.
---

# Guide: Hotkeys

## Quick path

- For common app shortcuts: use `useStandardHotkeys()`.
- For custom keybinds: use `useHotkeys()` or `useHotkey()`.

The complete shortcut catalog is in `docs/keyboard-shortcuts.md`.

## Standard shortcuts

Example:

```tsx
import React from 'react';
import { useStandardHotkeys } from '../hooks';

export function MyApp() {
    useStandardHotkeys({
        onSave: () => {
            // save
        },
        onFind: () => {
            // open search
        },
    });

    return <div />;
}
```

## Custom shortcuts

Example:

```tsx
import React, { useMemo } from 'react';
import { useHotkeys } from '../hooks';

export function MyApp() {
    const hotkeys = useMemo(
        () => [
            {
                shortcut: { key: 'k', ctrl: true },
                handler: () => console.log('Ctrl+K'),
            },
        ],
        []
    );

    useHotkeys(hotkeys);

    return <div />;
}
```

## Labels in UI

If you need a human label like “Ctrl+S”, use `getShortcutLabel()` from `hooks/useHotkeys`.

## Next

- Full hook list: `reference/hooks.md`
- Shortcut catalog: `docs/keyboard-shortcuts.md`
