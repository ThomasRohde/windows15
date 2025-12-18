---
name: windows15-state-management
description: Where state lives in Windows 15: contexts, hooks, persistence, and storage.
load_when: You’re deciding where to store data, how to access OS features, or which hook to use.
---

# State Management

## The rule of thumb

- **OS-level state** (windows, wallpaper, start menu) lives in React contexts under `context/`.
- **App-level state** should usually live inside the app component, optionally persisted via hooks.

## OS contexts (what they do)

### Core Contexts

| Context               | Hook                 | Purpose                             |
| --------------------- | -------------------- | ----------------------------------- |
| `WindowContext`       | `useWindowManager()` | Window lifecycle, geometry, z-order |
| `AppRegistryContext`  | `useAppRegistry()`   | Registered apps + lookup            |
| `StartMenuContext`    | `useStartMenu()`     | Start menu open/close state         |
| `WallpaperContext`    | `useWallpaper()`     | Active wallpaper selection          |
| `LocalizationContext` | `useLocalization()`  | i18n, date/time formatting          |
| `ScreensaverContext`  | `useScreensaver()`   | Screensaver behavior and settings   |
| `WindowSpaceContext`  | `useWindowSpace()`   | 3D/window-space settings            |

### OS Service Contexts

| Context               | Hook                 | Purpose                                  |
| --------------------- | -------------------- | ---------------------------------------- |
| `SystemInfoContext`   | `useSystemInfo()`    | OS version, CPU, memory, storage metrics |
| `NetworkContext`      | `useNetwork()`       | Online status, latency, connection type  |
| `ClipboardContext`    | `useClipboard()`     | Copy/paste with history (max 25 items)   |
| `NotificationContext` | `useNotifications()` | Scheduled and immediate notifications    |

### Data Contexts

| Context              | Hook               | Purpose                       |
| -------------------- | ------------------ | ----------------------------- |
| `DbContext`          | `useDb()`          | Dexie database instance       |
| `UserProfileContext` | `useUserProfile()` | User settings and preferences |

### The `useOS()` convenience wrapper

`context/OSContext.tsx` composes multiple providers and exposes a single `useOS()` hook that re-exports:

- window management APIs
- app registry APIs
- wallpaper + start menu APIs

Prefer direct hooks (`useWindowManager`, `useAppRegistry`, …) when you want tighter typing or clearer dependencies; use `useOS()` for convenience and backward compatibility.

## Persistence: localStorage vs IndexedDB

This repo supports both:

- `useLocalStorage()` for lightweight, non-critical state
- `usePersistedState()` for Dexie/IndexedDB-backed persistence

In most apps, prefer `usePersistedState()` so state survives refresh and can participate in the OS’s storage strategy.

For deeper notes, see `docs/state-persistence.md`.

## Storage services

OS persistence is done through utilities under `utils/` (e.g., `storageService`). Apps should generally not reach for OS storage keys directly; use hooks instead.

## Next

- Data flow diagrams: `core/data-flow.md`
- Hook lookup: `reference/hooks.md`
- Context lookup: `reference/contexts.md`
