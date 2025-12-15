---
name: windows15-guide-styling
description: Build consistent app UI using the repo’s UI primitives and Tailwind conventions.
load_when: You’re implementing UI and want it to match the Windows 15 look/feel.
---

# Guide: Styling Patterns

## Use the UI primitives first

Most apps should prefer `components/ui/*` rather than bespoke styling.

Common building blocks:

- Layout: `AppContainer`, `SplitPane`
- Inputs: `TextInput`, `TextArea`, `Checkbox`, `Select`, `Slider`
- Actions: `Button`, `CopyButton`, `ConfirmDialog`
- Structure: `Card`, `SectionLabel`, `AppToolbar`, `AppSidebar`, `TabSwitcher`
- States: `LoadingState`, `EmptyState`, `ErrorBanner`

See the full list in `reference/ui-components.md`.

## App layout baseline

Typical app skeleton:

```tsx
import React from 'react';
import { AppContainer } from '../components/ui/AppContainer';
import { AppToolbar } from '../components/ui/AppToolbar';

export function MyApp() {
    return (
        <AppContainer padding gap="md">
            <AppToolbar title="My App" />
            <div>Content…</div>
        </AppContainer>
    );
}
```

## Tailwind usage guidelines

- Prefer the same utility patterns already used in existing apps.
- Avoid introducing new design tokens or hard-coded colors; use existing Tailwind classes (like other apps do).

## Empty/loading/error

Apps should handle:

- “nothing to show” → `EmptyState`
- “loading” → `LoadingState`
- “error” → `ErrorBanner`

## Next

- UI component reference: `reference/ui-components.md`
