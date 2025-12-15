---
name: windows15-guide-notifications
description: Show toast notifications using the built-in notification hook.
load_when: You need user feedback for save/copy/error states.
---

# Guide: Notifications

Use `useNotification()` from `hooks/useNotification.ts` to show toast notifications.

## Example

```tsx
import React from 'react';
import { useNotification } from '../hooks';

export function MyApp() {
    const notify = useNotification();

    return (
        <button
            onClick={() => {
                notify.success('Saved');
            }}
        >
            Save
        </button>
    );
}
```

## Common patterns

- `notify.success('...')` after successful actions
- `notify.error('...')` when operations fail
- `notify.info('...')` for background operations

## Next

- Full hook list: `reference/hooks.md`
