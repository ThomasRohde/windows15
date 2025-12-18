---
name: windows15-example-calculator
description: Walkthrough of a simple app that uses local component state + notifications + clipboard.
load_when: You want a small, contained example for app structure and hook usage.
---

# Example Walkthrough: Calculator

This walkthrough uses `apps/Calculator.tsx` as a reference for a **self-contained** app.

## What to notice

### 1) App structure is just a component

The app exports a React component (`Calculator`) and relies on the OS to provide window chrome.

- The registry entry is in `apps/registry.ts`.
- The OS mounts the component inside `components/Window.tsx`.

### 2) Uses UI primitives

Calculator uses `AppContainer` to align with the OS’s spacing/layout expectations.

### 3) Uses hooks for OS-adjacent UX

It demonstrates two common app patterns:

- `useNotification()` for user feedback (e.g., “Copied to clipboard”)
- `useCopyToClipboard()` for clipboard operations

These hooks are exported via `hooks/index.ts`.

### 4) Keeps state local when persistence isn’t needed

Calculator stores transient state via `useState`:

- current display string
- accumulator
- operator

This is the simplest correct approach for apps that don’t need restore-on-refresh.

## When to copy this pattern

- You’re building a tool-like app (converter, generator, viewer)
- State is derived and can be reset without user harm
- Persistence would add complexity without value

## Next

- If you need persistence: `guides/adding-persistence.md`
- If you need hotkeys: `guides/hotkeys.md`
