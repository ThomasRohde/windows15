# Windows15 — Real‑time Dexie Sync (No Refresh) + Full PWA Enablement (PRD)

Version: 1.0  
Owner: Thomas Rohde  
Date: 2025-12-13  
Repo: `ThomasRohde/windows15`

## Why this PRD exists

You have integrated Dexie.js successfully, but synchronization only “shows up” after refreshing open browser windows/tabs. In practice this usually means one (or both) of these are true:

1) The UI is not reactive to IndexedDB mutations (so the DB updates but React doesn’t re-render).  
2) Dexie Cloud configuration/open happens too early/late, so other tabs need a hard reload before they “attach” to the correct cloud-suffixed local DB name. Dexie Cloud’s docs explicitly state `db.cloud.configure()` must be called before requests are made to the DB (before it opens) so the DB knows how to open the right backing store.

This PRD fixes both by:
- making UI read paths reactive via `dexie-react-hooks` / `useLiveQuery()`
- introducing a “DB lifecycle” provider that initializes Dexie only after reading the saved cloud configuration and can *hot-reinitialize* the DB instance when config changes (without a full page reload)

At the same time, we will make Windows15 a “real” installable PWA with offline caching and (optionally) Dexie Cloud service-worker background/periodic sync.

## Goals (what success looks like)

Real-time sync without refresh:
- With two tabs/windows open to the app, edits made in one are reflected in the other within 1 second without manual refresh.
- Remote changes (from another device) are pulled automatically while the app is open; and (when installed as a PWA in supporting browsers) periodic/background sync can keep the local DB warm even when not active.

Full PWA enablement:
- The app is installable (manifest, icons, correct scope/start_url for GitHub Pages).
- App shell loads offline after at least one successful online visit (offline-first UX).
- Clear update flow: prompt or auto-update behavior is defined and tested.

## Non-goals

- Building a custom backend or abandoning Dexie Cloud (BYO Dexie Cloud stays).
- Implementing push notifications (optional future enhancement).
- Offline-first for first-time visitors with zero prior visit (out of scope for a static PWA; requires preinstall packaging or more complex distribution).

## Target users / personas

- Primary: Thomas (power user, will actually use sync and PWA install).
- Secondary: Random visitor (may try the app; can opt into BYO Dexie Cloud if desired).

## Assumptions & constraints

- Hosting on GitHub Pages (requires correct base path and service worker scope).
- No server-side authentication is implemented by Windows15; Dexie Cloud handles auth on the client as needed.
- The existing UI may be using “load once” patterns (e.g., `useEffect(() => db.table.toArray()...)`) that do not re-render on DB changes.

## User stories

1) As a user, when I update data in one open window, other windows show the update immediately.  
2) As a user, I can see if I’m “in sync”, “pulling”, “pushing”, “offline”, or in error.  
3) As a user, I can change my Dexie Cloud database URL and the app reconnects without a full page refresh.  
4) As a user, I can install Windows15 as a PWA and it loads offline with the last cached app shell.  
5) As a user, I can get a clear prompt when a new version is available (or the app auto-updates—explicitly defined).

## Functional requirements

### FR1 — Reactive UI for all persisted views
- Any UI surface that reads persisted state from Dexie must be converted to a reactive query:
  - Use `useLiveQuery()` for list/detail queries.
  - Use `useObservable()` for Dexie Cloud observables (e.g., `db.cloud.currentUser`, `db.cloud.syncState`).
- Remove patterns where state is loaded once and stored in React state without an observer.

Acceptance criteria:
- In a second tab, the same screen updates without refresh when the first tab writes to Dexie.

### FR2 — Automatic sync “kick” and correctness on first load
- Ensure Dexie Cloud is configured before opening and querying the DB:
  - Read saved config (Dexie Cloud database URL, any flags) *before* creating/using the Dexie instance.
  - Avoid any Dexie queries before configuration is applied.

Acceptance criteria:
- Opening a second tab immediately attaches to the correct cloud-backed DB (no refresh required).

### FR3 — Hot reconnection when cloud config changes (no reload)
- When the user sets/changes the Dexie Cloud database URL:
  - Close the active Dexie instance cleanly.
  - Create a new Dexie instance configured with the new URL.
  - Swap it into the app through a provider/context (soft restart).
- Propagate config change across tabs:
  - Write config to `localStorage`.
  - Broadcast via `BroadcastChannel` (preferred) and/or `storage` event as fallback.
  - Other tabs detect config change and perform the same hot reinit.

Acceptance criteria:
- Changing config in Tab A makes Tab B reconnect within 3 seconds (shows “reconnecting…” state) without manual refresh.

### FR4 — Sync status component
- Add a small “sync status” indicator (taskbar/system tray style) showing:
  - Logged in/out status (from `db.cloud.currentUser`)
  - Sync phase/status + progress + error (from `db.cloud.syncState`)
  - WebSocket status if available (nice-to-have)
  - “Sync now” action that calls `db.cloud.sync({ purpose: 'pull' })` and/or `db.cloud.sync()`.

Acceptance criteria:
- UI visibly reflects transitions: offline → online, pulling/pushing → in-sync, error states.

### FR5 — Fully enabled PWA
Must-have PWA items:
- Web app manifest with correct:
  - `name`, `short_name`, `icons`, `theme_color`, `background_color`
  - `display: standalone`
  - `start_url` and `scope` compatible with GitHub Pages base path
- Service worker:
  - Precache app shell/assets
  - Runtime caching for external CDN dependencies (e.g., Tailwind CDN) if still used
  - Explicitly exclude Dexie Cloud endpoints from caching
- Install UX:
  - Ensure browser install works; optionally add “Install” button (nice-to-have).
- Update UX:
  - Choose either “prompt to update” or “auto update” and implement consistently.

Acceptance criteria:
- Lighthouse (or equivalent) shows the app as installable.
- After one successful load, the app reloads offline and shows the shell UI.

### FR6 — Dexie Cloud service worker integration (optional but recommended)
If using Dexie Cloud’s `tryUseServiceWorker` / periodic sync:
- Register a service worker and integrate Dexie Cloud’s service-worker script as described in their docs.
- Configure `db.cloud.configure({ tryUseServiceWorker: true, periodicSync: { minInterval } })` when applicable.
- Provide a fallback for browsers without periodic sync support (app-open eager sync still works).

Acceptance criteria:
- In Chrome/Edge with the PWA installed, periodic sync registration succeeds (where supported) and does not break normal operation.

## UX requirements

- No “refresh to sync” instructions anywhere.
- Errors are actionable:
  - “Invalid database URL”
  - “Network offline”
  - “Auth required / login needed”
- Sync indicator should never be noisy; keep it minimal but informative.
- When hot reinitializing DB, show a non-blocking toast/banner “Reconnecting…” and disable writes briefly if needed.

## Technical design (developer-ready)

### Proposed architecture

1) `DbProvider` (React context)
- Holds current `db` instance and a `dbState`:
  - `status`: `initializing | ready | reconnecting | error`
  - `error?`
  - `cloudConfig?` (databaseUrl + options)
- Exposes:
  - `db`
  - `reconfigureCloud(config)`
  - `syncNow()`
  - `signIn()` / `signOut()` (if you expose these)

2) `dbFactory`
- Pure function that creates a fresh Dexie instance:
  - defines schema
  - attaches dexie-cloud-addon if configured
  - calls `db.cloud.configure()` BEFORE any open/query happens

3) Reactive reads
- Convert all data-driven UI to use:
  - `useLiveQuery(() => db.table.where(...).toArray(), [deps])`
  - `useObservable(db.cloud.currentUser)`
  - `useObservable(db.cloud.syncState)`

4) Cross-tab config propagation
- `BroadcastChannel('windows15-config')` message contains:
  - `{ databaseUrl, updatedAt }`
- Write-through to `localStorage` key `windows15.dexieCloud.databaseUrl` for persistence and fallback eventing.
- Listener triggers `DbProvider.reconfigureCloud()`

### File/module layout (suggested)

- `src/data/db/schema.ts`
- `src/data/db/dbFactory.ts`
- `src/data/db/DbProvider.tsx`
- `src/data/db/useDb.ts`
- `src/ui/SyncStatus.tsx`
- `src/pwa/registerPwa.ts`
- `public/manifest.webmanifest`
- `public/icons/*`
- `public/sw.js` (if using `injectManifest` strategy) or `src/sw.ts` (depending on chosen setup)

### Key implementation notes

- Important: `db.cloud.configure()` must run before any Dexie requests (so don’t let components import a pre-opened singleton and query immediately).
- Avoid importing `db` at module top-level in components. Prefer `const { db } = useDb()` from context.

### PWA implementation choice

Use `vite-plugin-pwa` (injectManifest strategy) so you can:
- control caching rules
- integrate Dexie Cloud’s service worker script
- implement update prompts cleanly

Minimal config expectations:
- GitHub Pages base path awareness (manifest start_url/scope and SW scope)
- Workbox precache + runtime caching for external CDN resources (if any)

### Service worker + Dexie Cloud integration (concept)

Option A (recommended): injectManifest + `importScripts()` Dexie Cloud SW bundle:
- In SW file:
  - precacheAndRoute(__WB_MANIFEST)
  - import Dexie Cloud SW script (either as a copied asset or via Vite asset URL import)
- In app:
  - configure Dexie Cloud with `tryUseServiceWorker: true`

## Backlog / tasks

### P0 (must ship)

1) Add deps
- `dexie-react-hooks`
- `vite-plugin-pwa`

2) Introduce `DbProvider` + `dbFactory`
- Move all Dexie instance creation to factory/provider
- Ensure no Dexie queries happen before provider is ready

3) Convert read paths to reactive
- Replace non-reactive loads with `useLiveQuery`
- Replace cloud user/sync state with `useObservable`

4) Cross-tab config propagation
- Implement BroadcastChannel + localStorage sync
- Hot reinit in other tabs

5) PWA baseline
- Manifest + icons
- Service worker registration
- Offline app shell (precache)
- Update prompt behavior (choose and implement)

### P1 (strongly recommended)

6) Sync status UI
- Minimal indicator + “Sync now”
- Error/Offline messaging

7) Dexie Cloud SW background/periodic sync
- Integrate Dexie Cloud SW
- Enable `tryUseServiceWorker` + `periodicSync` where supported

### P2 (nice-to-have)

8) “Install” button & onboarding
- Detect installability and show a subtle install CTA
- Small onboarding explaining BYO Dexie Cloud

9) Remove Tailwind CDN dependency
- Compile Tailwind locally for stronger offline guarantees and faster cold start

## Acceptance test plan

### Multi-tab sync (local)
- Open Tab A and Tab B to the same app origin.
- Make a change in Tab A (create/update/delete).
- Observe Tab B updates within 1 second with no refresh.

### Multi-device sync (Dexie Cloud)
- Device 1 and Device 2 logged into same Dexie Cloud DB.
- Change on Device 1 shows on Device 2 while app is open (eager sync).

### Config change hot-reinit
- In Tab A, change databaseUrl.
- Tab A reconnects without full refresh.
- Tab B auto-reconnects within 3 seconds without refresh.

### PWA install & offline
- Install app in Chrome/Edge.
- Go offline.
- Launch installed app: shell loads and previously visited routes/apps load if cached.

### Update flow
- Build + deploy new version.
- Client detects update and shows prompt (or auto-reloads, depending on chosen strategy).

## Telemetry / debugging (developer-only)

- Optional console logging gated by `localStorage.windows15.debugSync = "1"`:
  - config changes
  - db lifecycle transitions
  - syncState changes and last sync timestamps

## Risks & mitigations

- Risk: Some components import a `db` singleton directly and will bypass provider.
  - Mitigation: enforce via lint rule or codemod; quick grep for `import { db } from`.

- Risk: Service worker caching breaks Dexie Cloud endpoints or auth.
  - Mitigation: explicitly exclude cloud endpoints from caching; keep runtime caching to static assets only.

- Risk: Hot DB swap causes transient null/undefined data in UI.
  - Mitigation: `DbProvider` exposes readiness; components show skeleton/placeholder during reconnect.

## Open questions

1) Do you want every random visitor to be able to use local-only mode by default, and optionally “connect Dexie Cloud”? (recommended)  
2) Which PWA update behavior do you prefer: “prompt” (safer) or “autoUpdate” (simpler, but can surprise users)?  
3) Do you want unsynced/local-only tables (e.g., UI layout preferences) separated from synced data?

## References (implementation docs)

- Dexie React hooks: `useLiveQuery()` / `useObservable()`
- Dexie Cloud: `db.cloud.configure()`, `DexieCloudOptions`, `SyncState`, `db.cloud.currentUser`, `db.cloud.events.syncComplete`
- Vite PWA plugin docs: injectManifest strategy, update prompt / autoUpdate
