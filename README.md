<div align="center">
  <img
    width="1200"
    height="475"
    alt="Windows 15 Concept banner"
    src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6"
  />
</div>

# Windows 15 Concept

A futuristic Windows-style desktop UI built with React + Vite: glassmorphism, draggable windows, widgets, and a handful of demo apps.

- Live demo (GitHub Pages): `https://<your-username>.github.io/<your-repo>/`

## Features

- Window manager (focus, minimize, maximize)
- Start menu + taskbar
- Widgets and wallpaper switching
- Demo apps: File Explorer, Browser, Mail, Calendar, Calculator, Notepad, Settings

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS (via CDN) + custom CSS
- Material Symbols + Inter font

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

1. In your GitHub repo: Settings → Pages → Build and deployment → Source: GitHub Actions
2. Push to `main` or `master` (or run the workflow from the Actions tab)
3. Your site will be available at `https://<your-username>.github.io/<your-repo>/`

## Notes

- This is a UI concept/demonstration; the apps run entirely in the browser (some state is stored in `localStorage`).
