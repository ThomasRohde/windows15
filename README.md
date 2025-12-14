<div align="center">
  <img
    width="1200"
    height="475"
    alt="Windows 15 Concept banner"
    src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6"
  />
</div>

# Windows 15 Concept

[![CI](https://github.com/ThomasRohde/windows15/actions/workflows/ci.yml/badge.svg)](https://github.com/ThomasRohde/windows15/actions/workflows/ci.yml)

A futuristic Windows-style desktop UI built with React + Vite: glassmorphism, draggable windows, widgets, and a handful of demo apps.

- Live demo (GitHub Pages): `https://thomasrohde.github.io/windows15/`

## Features

- Window manager (focus, minimize, maximize)
- Start menu + taskbar
- Widgets and wallpaper switching
- Offline-first persistence (Dexie / IndexedDB)
- Optional BYO cloud sync (Dexie Cloud)
- Demo apps: File Explorer, Browser, Mail, Calendar, Calculator, Notepad, Settings

## Tech Stack

- React 19 + TypeScript
- Vite
- Dexie + Dexie Cloud (optional BYO sync)
- Tailwind CSS (via CDN) + custom CSS
- Material Symbols + Inter font

## Persistence & Sync

- Default mode: local-only (Dexie / IndexedDB) - no setup required.
- Optional sync mode: Settings > Sync lets you paste your own Dexie Cloud `databaseUrl` to sync `kv`, `notes`, and `bookmarks` across devices.

### Enable Sync (BYO Dexie Cloud)

1. Create a Dexie Cloud database:
    - `npx dexie-cloud create`
2. Whitelist your app origin (copy it from Settings > Sync):
    - `npx dexie-cloud whitelist <origin>`
    - GitHub Pages origin is `https://thomasrohde.github.io` (no `/windows15` path).
3. Open `dexie-cloud.json`, copy `databaseUrl`, then paste it into Settings > Sync and click Connect + Login.

## Local Development

Prerequisites: Node.js 18+

```bash
npm install
npm run dev
```

## Build & Preview

```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages (GitHub Actions)

This repo includes a GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) that builds the Vite app and deploys `dist/` to GitHub Pages on every push to `main`/`master`.

1. In your GitHub repo: Settings > Pages > Build and deployment > Source: GitHub Actions
2. Push to `main` or `master` (or run the workflow from the Actions tab)
3. Your site will be available at `https://<your-username>.github.io/<your-repo>/`

Note: The workflow sets `BASE_PATH` automatically. If you build manually for a repo page, set `BASE_PATH` to `/<repo>/`.

## Notes

- Dexie Cloud `databaseUrl` is stored in browser `localStorage`; auth tokens are handled internally by Dexie Cloud.
