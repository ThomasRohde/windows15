---
name: windows15-example-notepad
description: Walkthrough of a more complex app that supports multiple views and can be opened with file props.
load_when: You need a pattern for multi-view apps and for using openWindow(contentProps).
---

# Example Walkthrough: Notepad

This walkthrough references `apps/Notepad.tsx` and its supporting components under `apps/notepad-components/`.

## What to notice

### 1) Supports “open normally” and “open with a file”

Notepad accepts props:

- `initialContent?: string`
- `initialFileId?: string`
- `initialFileName?: string`

These can be passed when launching via:

```ts
openWindow('notepad', {
    initialContent: 'Hello',
    initialFileName: 'hello.txt',
});
```

This works because `openWindow(appId, contentProps)` renders:

- `<app.component {...contentProps} />`

(see `context/WindowContext.tsx`).

### 2) View selection derived from launch context

Notepad treats “opened from file” as a first-class mode:

- if opened with file props → starts in `files` view
- otherwise → starts in `notes` view

This is a robust pattern for apps that can be launched from multiple entrypoints.

### 3) Decomposes complex UI into panels

Notepad delegates real work to:

- `NotesPanel`
- `FilesPanel`

This keeps the top-level app component focused on routing/coordination.

## When to copy this pattern

- Your app has multiple “modes” or views
- Your app can be launched with input data (file, selection, query)
- You want a small coordinating component + specialized subcomponents

## Next

- Window lifecycle details: `core/window-lifecycle.md`
- App registration: `core/app-architecture.md`
