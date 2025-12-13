# PRD: Windows15 — BYO Dexie Cloud Sync (Bring Your Own Database)

Owner: Thomas  
Repo: https://github.com/ThomasRohde/windows15  
Deployment target: GitHub Pages (`https://thomasrohde.github.io/windows15`)

## What you’re really trying to achieve (so we don’t miss the point)
You want persistent, cross-device state (and eventually “real apps” like Notepad notes, browser bookmarks, etc.) for a purely static site hosted on GitHub Pages—without running your own backend.

Dexie + Dexie Cloud is a good fit: it keeps an offline-first local DB (IndexedDB) and adds optional two-way sync + auth when configured.

This PRD describes a “BYO Dexie Cloud” approach:
- Every user creates their own Dexie Cloud database.
- The Windows15 app only asks for the user’s database URL and then uses Dexie Cloud auth to log them in to *their* database.
- No shared database, no server-side code, no admin work for you.

## Background / Context
Windows15 is a UI concept (React + Vite) where some state is stored in localStorage today. The app runs fully client-side on GitHub Pages (no backend).

Dexie Cloud requires:
1) a cloud database URL (created via `npx dexie-cloud create`), and  
2) the app’s origin to be whitelisted in that database (via `npx dexie-cloud whitelist <origin>`),  
3) `db.cloud.configure({ databaseUrl })` to run before the DB is used.

## Goals
1) Add a proper persistence layer using Dexie (IndexedDB) to replace/augment localStorage.
2) Add an optional Dexie Cloud sync mode when the user supplies a `databaseUrl`.
3) Provide an in-app onboarding flow that tells users exactly how to create + whitelist their own Dexie Cloud DB.
4) Keep the default experience “works without setup” (local-only mode) for casual visitors.

## Non-goals
- No single shared Dexie Cloud DB for all visitors (that’s a different approach).
- No self-hosted/on-prem Dexie Cloud server setup.
- No advanced access-control model / role management beyond defaults.
- No guarantee of “no friction”—BYO is intentionally a bit manual.

## Key product decision: BYO vs shared DB (tradeoffs)
BYO Dexie Cloud is great when:
- you want *zero* ops and don’t want to be responsible for other users’ data.
- you’re okay with onboarding friction (CLI step, whitelist step).

BYO Dexie Cloud is annoying when:
- you expect lots of random visitors to actually use sync (they won’t).
- you want “one click enable sync” for everyone (shared DB is better for that).

Given you explicitly don’t mind friction and likely only you will use it, BYO is reasonable.

## Personas & user stories
Persona A: “Thomas / power user”
- As a user, I want to connect Windows15 to my own Dexie Cloud DB so my desktop state syncs across devices.
- As a user, I want a clear error if my origin isn’t whitelisted, and guidance to fix it.

Persona B: “Random visitor”
- As a visitor, I want Windows15 to still work without sign-up.
- As a visitor, if I choose to enable sync, I want a checklist that walks me through creation + configuration.

## Scope: what data to persist/sync (MVP)
MVP should sync the “OS state” and a couple of obvious apps.

Persist + sync (MVP tables):
1) `kv` (key-value state store)
   - Covers: wallpaper selection, widget layout, pinned apps, window placements, app-specific settings, etc.
   - Enables fast migration from localStorage.
2) `notes` (Notepad)
   - Basic note list, edit, delete, timestamps.
3) `bookmarks` (Browser bookmarks)
   - URL + title + folder path.

Local-only (MVP, unsynced):
- Any “ephemeral” state that doesn’t matter across devices:
  - transient UI state (open menus, hover, drag-in-progress)
  - volatile caches
  - debug flags

Post-MVP candidates:
- File Explorer virtual filesystem (files/folders)
- Mail drafts
- Calendar events
- App installations / “store” concept
- Browser history
- Per-app permissions

## Functional requirements

### FR1: Add Dexie persistence layer (local-only baseline)
- Add Dexie DB with schema versioning.
- Replace direct localStorage access for persistent state with a `StorageService` abstraction.
- Provide migration from existing localStorage keys into Dexie on first run after upgrade.
- Keep localStorage as fallback for a limited time (or behind a feature flag) to reduce risk.

Acceptance:
- User can refresh the page and keeps state from Dexie (even if localStorage is cleared after migration is done).
- No sync required; everything works offline.

### FR2: Optional Dexie Cloud sync via user-provided databaseUrl
- Add dexie-cloud-addon and configure cloud sync when a `databaseUrl` has been provided.
- Provide UI in Settings app: “Sync” section with:
  - Status: Local-only / Connected / Error
  - Current app origin (copy button): `window.location.origin`
  - Field: “Dexie Cloud database URL” (paste)
  - Buttons: “Connect”, “Disconnect”, “Login/Logout”, “Reset local data”
  - A collapsible “How to set up” wizard.

Acceptance:
- When user pastes a valid databaseUrl and the origin is whitelisted, Windows15 syncs `kv`, `notes`, `bookmarks` across devices.
- If origin is not whitelisted, UI surfaces a clear fix (“Run: npx dexie-cloud whitelist <origin>”).

### FR3: Onboarding wizard for BYO Dexie Cloud
In Settings → Sync, present a step-by-step checklist (copy/paste friendly):

Step 0: Create Dexie account (link out)
Step 1: Create DB (CLI)
- `npx dexie-cloud create`
- explain that this creates `dexie-cloud.json` and `dexie-cloud.key` locally

Step 2: Whitelist origins
- Dev origin (example): `http://localhost:5173` (or show user’s current local origin when running locally)
- Prod origin: `https://thomasrohde.github.io` (IMPORTANT: origin excludes path like `/windows15`)

Commands:
- `npx dexie-cloud whitelist <origin>`

Step 3: Copy the databaseUrl from `dexie-cloud.json` and paste it into Windows15 → Settings → Sync.

Acceptance:
- A new user can enable sync by following only the wizard steps (no external doc required).

### FR4: “Works without auth” / “auth required” behavior
Policy:
- Default: don’t force authentication for local-only mode.
- If cloud sync is configured, require login before syncing sensitive tables (MVP uses defaults).

Implementation options:
- Set `requireAuth: true` when databaseUrl is present, so syncing waits for login.
- Alternatively keep `requireAuth` false and let the user opt in to login; for MVP we prefer `requireAuth: true` to avoid confusion.

Acceptance:
- If cloud sync is configured, “Connected” implies “Logged in (or prompt)”, not “silently doing nothing”.

### FR5: Basic “multi-device correctness” rules
- Use stable primary keys and updated timestamps.
- For `kv`, store JSON values and an `updatedAt` (client timestamp) to enable simple last-write-wins for conflicting keys.
- Prefer idempotent writes: same action on two devices results in deterministic merges.

Acceptance:
- Editing a note on device A and then on device B produces a sane final result (last edit wins).
- Bookmark list converges across devices.

## UX requirements (Settings → Sync)
- Show connection mode badge:
  - “Local-only” (no databaseUrl configured)
  - “Cloud configured” (databaseUrl stored)
  - “Logged in” (cloud user exists)
  - “Syncing / Online / Offline” (best effort)
- Show explicit, copyable “App Origin” value (this is what must be whitelisted).
- Provide “Disconnect” that:
  - logs out (optional)
  - disables cloud by clearing stored databaseUrl
  - keeps local Dexie data unless the user chooses “Reset local data”.

## Technical design

### Dependencies
Add:
- `dexie`
- `dexie-cloud-addon`

### DB schema (MVP)
Create a module, e.g. `utils/db.ts` or `utils/storage/db.ts`:

- `kv`
  - `key: string` (primary key)
  - `valueJson: string`
  - `updatedAt: number` (ms since epoch)
- `notes`
  - `id: string` (primary key; uuid)
  - `title: string`
  - `content: string`
  - `updatedAt: number`
  - `createdAt: number`
- `bookmarks`
  - `id: string` (uuid)
  - `url: string`
  - `title: string`
  - `folder: string` (path-like string)
  - `updatedAt: number`
  - `createdAt: number`

Indexes:
- `kv`: primary key only
- `notes`: `updatedAt`, `createdAt`
- `bookmarks`: `folder`, `updatedAt`

### Cloud configuration rules
- Read `databaseUrl` from a stable local config store (localStorage is acceptable for *just* the URL and UX prefs; the actual data goes in Dexie).
- IMPORTANT: call `db.cloud.configure({ databaseUrl, ... })` before any DB requests happen (before the app renders components that touch the DB).

Recommended cloud options (MVP):
- `requireAuth: true` when databaseUrl exists
- `tryUseServiceWorker: false` (avoid SW complexity in MVP; revisit later)
- `customLoginGui: false` (use default login UI in MVP)
- `unsyncedTables: []` (or list local-only tables if you add them)

### Storage abstraction
Introduce a small “storage API” so you can migrate incrementally without rewriting everything at once.

Example interface:
- `get<T>(key): Promise<T | undefined>`
- `set<T>(key, value): Promise<void>`
- `remove(key): Promise<void>`
- `subscribe(key, handler): unsubscribe` (optional)
- `export(): Promise<Blob>` (optional, later)
- `import(blob): Promise<void>` (optional, later)

Implementations:
- `DexieStorageService` (MVP default)
- `LocalStorageService` (legacy fallback for migration)

### Migration plan (localStorage → Dexie `kv`)
- On first load after adding Dexie:
  1) read all known localStorage keys used by Windows15
  2) write them into `kv` (with `updatedAt = Date.now()`)
  3) mark “migrationComplete = true” in `kv` or localStorage
  4) optionally clear migrated localStorage keys (but keep a safety toggle during beta)

### Error handling (common failure modes)
1) Invalid databaseUrl format
- Detect with `new URL(databaseUrl)` and ensure `https:`.
- Show inline error.

2) Origin not whitelisted
- Detect via thrown auth/network error during sync/login.
- Show “Whitelist required” and provide the exact origin string + command snippet.

3) User not logged in (requireAuth enabled)
- Show “Login required” and provide a Login button (calls `db.cloud.login()`).
- Show current user email when logged in.

4) Offline
- Show “Offline (local changes queued)” and last successful sync timestamp (best effort).

### Security / privacy
- Treat `databaseUrl` as configuration, not a secret. Tokens/session material are handled by Dexie Cloud addon internally.
- Do not log tokens or DB URLs to console in production builds.
- Provide “Disconnect” and “Reset local data” for privacy hygiene.

## Implementation plan (developer tasks)

### Phase 0: Discovery (1–2 hours)
- Inventory all localStorage usage (search `localStorage` in repo).
- Identify which keys represent durable state vs ephemeral UI state.
- Decide which keys to sync in MVP (`kv` list).

### Phase 1: Add Dexie local persistence (no cloud)
1) Add dependencies.
2) Add Dexie DB module with schema.
3) Implement `StorageService` abstraction.
4) Replace the highest-value localStorage usage with StorageService:
   - wallpaper / theme
   - pinned apps
   - desktop icon layout
   - any Settings app prefs
5) Add migration from localStorage → `kv`.

### Phase 2: Add cloud sync configuration UI (Settings → Sync)
1) Add “Sync” panel to Settings app.
2) Persist `databaseUrl` in localStorage (or in `kv`—but be careful: you need DB configured before DB use, so localStorage is simpler for bootstrap).
3) Add connect/disconnect actions.
4) Add copyable “origin” display.

### Phase 3: Dexie Cloud integration
1) Enable `dexie-cloud-addon` on the Dexie instance.
2) If databaseUrl is present:
   - call `db.cloud.configure({ databaseUrl, requireAuth: true })` before any DB ops.
3) Add login/logout UI:
   - Login calls `db.cloud.login()`
   - Logout calls `db.cloud.logout()`
4) Add basic status indicator (connected/logged in/offline/error).

### Phase 4: Persist real app data (MVP tables)
- Implement Notepad notes in Dexie (`notes` table).
- Implement Browser bookmarks in Dexie (`bookmarks` table).
- Wire existing UI to these tables (or add minimal UI if needed).

### Phase 5: Test & ship
- Local dev origin: verify whitelist and sync at `http://localhost:<port>`.
- GitHub Pages origin: verify whitelist and sync at `https://thomasrohde.github.io`.
- Verify:
  - local-only mode with no setup
  - cloud mode with setup
  - migration behavior
  - disconnect + reconnect
  - multi-device sync for notes/bookmarks

## Acceptance criteria (must pass)
- The app still runs fully on GitHub Pages with no backend.
- Local-only mode: persistent state survives refresh.
- Cloud mode:
  - With databaseUrl configured and origin whitelisted, notes and bookmarks sync across devices.
  - With databaseUrl configured but origin not whitelisted, user gets a precise fix instruction.
- “Disconnect” disables cloud without breaking local-only persistence.

## Open questions (answer during implementation)
1) Which localStorage keys are “durable” and should be moved into `kv`?
2) Should `kv` store per-feature namespaces (recommended) or keep raw legacy keys?
3) Do you want service worker integration for more resilient background sync (post-MVP)?

## Reference commands (for onboarding UI text)
- Create DB:
  - `npx dexie-cloud create`
- Whitelist origin:
  - `npx dexie-cloud whitelist https://thomasrohde.github.io`
  - `npx dexie-cloud whitelist http://localhost:5173`
- Locate DB URL:
  - open `dexie-cloud.json` and copy `databaseUrl`

## Suggested folder/files (implementation guideline)
- `utils/storage/`
  - `db.ts` (Dexie + schema + cloud config)
  - `storageService.ts` (interface + default instance)
  - `localStorageMigration.ts`
- `apps/settings/` (or wherever Settings app lives)
  - `SyncSettings.tsx` (UI + actions)

## “Codex-ready” instructions (paste into your Codex run prompt)
Implement this PRD in `ThomasRohde/windows15`:
- Add Dexie + dexie-cloud-addon.
- Introduce `StorageService` abstraction.
- Migrate durable localStorage keys into a Dexie `kv` table.
- Add Settings → Sync UI where user can paste Dexie Cloud `databaseUrl`, see `window.location.origin`, and trigger login/logout.
- When `databaseUrl` exists, configure `db.cloud.configure({ databaseUrl, requireAuth: true })` before any DB operations.
- Sync MVP tables: `kv`, `notes`, `bookmarks`.
- Ensure the app still works in local-only mode with no setup.
