---
name: windows15-reference-hooks
description: Quick lookup for custom hooks used by Windows 15 apps.
load_when: You need the exact hook name, signature shape, or example usage.
---

# Hooks Reference

This repo exposes hooks via `hooks/index.ts`.

## App state & persistence

- `usePersistedState(key, defaultValue)` → Dexie/IndexedDB-backed state (preferred for durable settings)
- `useLocalStorage(key, defaultValue)` → localStorage-backed state
- `useSeededCollection(...)` → collection state with optional seeding (see source)

## Hotkeys

- `useHotkey(...)` / `useHotkeys(...)` → custom keybindings
- `getShortcutLabel(shortcut)` → human-readable label
- `useStandardHotkeys(handlers, options?)` → common shortcuts like save/find

## Notifications

- `useNotification()` → `success/info/error` toast helpers

## Async and timing

- `useAsyncAction(fn, options?)` → async handler with loading/error state
- `useInterval(callback, delay)` / `useControllableInterval(...)` → intervals
- `useDebounce(value, delay)` → debounced value

## Window helpers (mostly internal)

These exist, but most apps should rely on OS/window contexts rather than implementing chrome behaviors:

- `useWindowDrag(...)`
- `useWindowResize(...)`
- `useWindowPersistence(...)`

## UX helpers

- `useCopyToClipboard()` → clipboard helper
- `useContextMenu(...)` → right-click menus
- `useSearchFilter(items, config)` → search/filter helper
- `useEventBus()` / `useAppEvent()` / `useAppEmit()` → event pub/sub

## Source of truth

For exact signatures and types, open:

- `hooks/index.ts` (exports)
- individual hook files in `hooks/`

## Next

- Hotkeys guide: `guides/hotkeys.md`
- Persistence guide: `guides/adding-persistence.md`
