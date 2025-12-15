---
name: windows15-reference-contexts
description: Quick lookup for OS and app contexts (useOS, useWindowManager, etc.).
load_when: You need OS APIs (windows, wallpaper, start menu), DB access, or user profile state.
---

# Contexts Reference

Contexts live in `context/`.

## Primary entrypoints

- `useOS()` (from `context/OSContext.tsx`) — convenience wrapper that exposes:
    - window management (`openWindow`, `closeWindow`, …)
    - app registry (`apps`, `registerApp`)
    - wallpaper (`activeWallpaper`, `setWallpaper`)
    - start menu (`toggleStartMenu`, `closeStartMenu`)

- Direct hooks (preferred when you only need one domain):
    - `useWindowManager()` — `context/WindowContext.tsx`
    - `useAppRegistry()` — `context/AppRegistryContext.tsx`
    - `useStartMenu()` — `context/StartMenuContext.tsx`
    - `useWallpaper()` — `context/WallpaperContext.tsx`
    - `useLocalization()` — `context/LocalizationContext.tsx`
    - `useWindowSpace()` — `context/WindowSpaceContext.tsx` (3D mode)

## Data & profile

- `useDb()` — `context/DbContext.tsx` (Dexie database access)
- `useUserProfile()` — `context/UserProfileContext.tsx`

## Screensaver

- `OSContext` also wires `ScreensaverProvider` and re-exports `useScreensaver()` from `context/ScreensaverContext.tsx`.

## Notes for app authors

- Most apps only need `usePersistedState()` and UI primitives.
- Use `useOS()` / `useWindowManager()` when an app needs to interact with windows (e.g., open another app).

## Next

- Window behaviors: `core/window-lifecycle.md`
- Hooks reference: `reference/hooks.md`
