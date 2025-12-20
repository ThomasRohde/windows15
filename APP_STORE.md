# Windows15 App Store for GitHub‑Hosted Mini‑Apps (PRD)

Owner: Thomas Klok Rohde  
Date: 2025‑12‑20  
Status: Draft (ready for implementation)

## 1. Background and motivation

Windows15 is a browser‑hosted “desktop OS” intended to reduce friction when switching between a constrained work laptop and a private laptop. A lightweight “App Store” that can install and launch mini‑apps hosted on GitHub Pages (or other static hosting) turns Windows15 from a fixed demo into a personal, portable platform.

Key constraint: Windows15 must run from static hosting (GitHub Pages), with no required backend.

## 2. Goals

1. Install, manage, and launch third‑party mini‑apps hosted as static sites (primarily GitHub Pages).
2. Keep Windows15 safe: external apps run isolated by default (sandboxed iframe), and must request capabilities via a controlled bridge.
3. Provide a credible “store” UX: browse, search, install/uninstall, update checks, and per‑app settings (permissions).
4. Support a self‑serve install flow: “Install from GitHub repo URL” without needing a server.
5. Preserve Windows15’s portability: installed app list and settings persist locally (Dexie) and can optionally sync (existing Windows15 sync strategy).

## 3. Non‑goals (v1)

- No payments, monetization, or identity/SSO.
- No executing third‑party code inside the Windows15 JS runtime (“module apps”) in v1.
- No mandatory centralized registry service; registry is a static JSON file + optional user-added registries.
- No guarantee of offline availability of third‑party app content (only Windows15’s metadata is offline).

## 4. Success metrics

- User can install an app from a curated registry in ≤ 2 clicks.
- User can install an app by pasting a GitHub repo URL in ≤ 30 seconds.
- Untrusted apps cannot access Windows15 storage or APIs without explicit permission prompts.
- Store supports at least 5 curated apps and 3 user-installed apps reliably.
- 0 known “drive-by” privilege escalations via postMessage bridge (see security tests).

## 5. Primary users and scenarios

Primary user: Thomas (power user). Secondary: any visitor to the public Windows15 site.

Scenarios:

- “I want the same set of tools on both laptops.” → install the same apps; settings persist.
- “I found a tiny tool on GitHub.” → paste repo URL; app appears in Start menu/desktop.
- “I’m trying something risky.” → app runs sandboxed; permissions must be granted.

## 6. Product decisions (closed/open questions resolved)

Decision A (v1 runtime): External apps run as sandboxed iframes (“web apps”).  
Rationale: module scripts are fetched with CORS and cross-origin module loading is fragile on static hosting; iframes + postMessage is robust. See references.

Decision B (manifest location): `/windows15.app.json` at repo root (or site root).  
Rationale: simplest to fetch via GitHub Contents API and static URLs.

Decision C (registry): Windows15 ships with a curated registry JSON hosted with Windows15, plus optional user‑added registry URLs.  
Rationale: no backend, but still scalable and community-friendly.

Decision D (updates): v1 provides manual “Check for updates” per app, and “pin to ref” for GitHub installs.  
Rationale: avoids background polling, rate limits, and surprises.

Decision E (security posture): deny-by-default capabilities; permissions are per app origin + appId.  
Rationale: simple mental model; aligns with browser security primitives.

## 7. App model

### 7.1 App types

- Built‑in app: ships in Windows15 bundle (existing model).
- Web app (external): hosted on static site; launched in iframe window.
- (Future) Module app: ES module loaded into runtime (out of scope v1).

### 7.2 App manifest (v1)

File: `windows15.app.json` (must be publicly accessible)

Schema name: `windows15-app-manifest/v1`

Example:

```json
{
    "schema": "windows15-app-manifest/v1",
    "id": "com.example.todo-mini",
    "name": "Todo Mini",
    "version": "1.0.0",
    "description": "Tiny todo board as a web app",
    "author": { "name": "Example Dev", "url": "https://github.com/example" },
    "license": "MIT",
    "icons": {
        "128": "icons/128.png",
        "512": "icons/512.png"
    },
    "entry": {
        "type": "web",
        "url": "https://example.github.io/todo-mini/"
    },
    "permissions": {
        "clipboardWrite": "ask",
        "notifications": "ask",
        "openExternalUrl": "allow",
        "storage": "none"
    },
    "links": {
        "homepage": "https://github.com/example/todo-mini",
        "issues": "https://github.com/example/todo-mini/issues"
    }
}
```

### 7.3 Permission model (v1)

Permission values:

- `deny` (default)
- `ask` (prompt on first use; allow once / always allow / deny)
- `allow` (no prompt; intended only for low-risk actions)

Supported permissions (v1):

- `openExternalUrl` (open in new tab/window)
- `notifications` (request OS notification; host mediates)
- `clipboardWrite` (write text to clipboard; host mediates; user gesture required)
- `themeRead` (read current theme tokens from host; no prompt)
- `windowStateRead` (read window size, position; no prompt)

Explicitly not supported (v1):

- `fileSystem`
- `clipboardRead`
- raw host storage access (Dexie)
- network proxying (CORS circumvention)

## 8. Discovery and installation

### 8.1 Curated registry (shipped with Windows15)

File: `appstore/registry.json` served from the Windows15 site.

Structure:

```json
{
    "schema": "windows15-app-registry/v1",
    "updatedAt": "2025-12-20T00:00:00Z",
    "apps": [
        {
            "id": "com.example.todo-mini",
            "manifestUrl": "https://example.github.io/todo-mini/windows15.app.json",
            "categories": ["Productivity"],
            "featured": true,
            "trust": "curated"
        }
    ]
}
```

### 8.2 User-added registries

Users can add registry URLs. Registries are fetched client-side and merged into a single catalog.

Rules:

- Duplicate app IDs: prefer curated > user registry > direct installs.
- Store indicates source for each app (Curated / Registry URL / Direct install).
- Cache registry responses in Dexie with `etag`/`lastModified` where available.

### 8.3 Install from GitHub repo URL (serverless)

Input: `https://github.com/<owner>/<repo>` (+ optional `ref`, default `HEAD`)

Flow:

1. Convert to GitHub Contents API request for `windows15.app.json`.
2. If found, parse manifest JSON.
3. If manifest includes `entry.url`, validate it is `https://` and not `javascript:`.
4. Install: store manifest + source metadata + permissions defaults.

Notes:

- GitHub REST API supports cross-origin requests via CORS for many endpoints (see references).
- Expect unauthenticated rate limits. Implement basic backoff and caching.

### 8.4 “Install by manifest URL”

Input: any `https://.../windows15.app.json`  
Same validation as above.

## 9. Runtime architecture

### 9.1 Web app runtime (sandboxed iframe)

External web app runs in an iframe window:

Recommended sandbox flags (default):

- `allow-scripts`
- `allow-forms`
- `allow-popups`
- `allow-downloads`
- `allow-same-origin`

Rationale: allows the app to function as a normal site within its own origin, while preventing parent access without postMessage. Communication must use `postMessage` (see bridge). References discuss sandbox risks and same-origin policy.

Additional restrictions:

- Always set `referrerpolicy="no-referrer"` for the iframe unless an app explicitly needs referrers.
- Consider `allow="clipboard-write; notifications"` only if permission is granted (progressive enhancement).

### 9.2 Host ↔ App bridge (postMessage protocol)

All messages are JSON objects with:

```ts
type Envelope = {
    protocol: 'windows15-bridge/v1';
    appId: string;
    requestId?: string;
    kind: 'hello' | 'capabilities' | 'request' | 'response' | 'event';
    payload: unknown;
};
```

Rules:

- Host validates `event.origin` matches the installed app’s `entry.url` origin.
- Host validates `appId` matches installed app record.
- Host responds only to known `request` methods.

Supported requests (v1):

- `openExternalUrl({ url })`
- `notify({ title, body })`
- `clipboardWrite({ text })`
- `themeRead()`
- `log({ level, message, data? })` (local only; no network)

Permission gating:

- Each request is checked against stored permissions.
- If `ask`, prompt user with: Allow once / Always allow / Deny.

### 9.3 Windowing integration

Installed web apps behave like first-class windows:

- Start menu entry
- Desktop icon (optional)
- Multi-window allowed per app (configurable)
- Standard window controls (minimize/maximize/close)
- Persist last window size/position per app (local)

## 10. Data model (Dexie)

Database name: `windows15`

Tables (suggested):

- `installedApps`
    - `id` (appId)
    - `manifest` (json)
    - `source` (`curated|registry|github|manifestUrl`)
    - `sourceMeta` (owner/repo/ref/path)
    - `installedAt`, `updatedAt`
    - `pinnedRef?` (string)
- `permissions`
    - compound key: `[appId+origin+permission]`
    - value: `deny|ask|allow` plus `grantedAt`
- `registries`
    - `url` (pk)
    - `enabled` (bool)
    - `cachedJson`
    - `etag?`, `lastModified?`, `fetchedAt`
- `auditLog` (optional v1.1)
    - event type + timestamp + appId + origin + details

## 11. UX requirements

### 11.1 App Store app

Views:

1. Catalog
    - Search
    - Categories
    - Filters: Source (Curated / Registries / Direct)
2. App details
    - Install / Uninstall
    - Source + trust badge
    - Version
    - Permissions requested (from manifest)
    - Links (homepage/issues)
3. Installed
    - Launch
    - Check for updates
    - Pin ref (GitHub installs)
    - Permissions settings (per permission)
4. Registries
    - Add registry URL
    - Enable/disable
    - Refresh

### 11.2 Permission prompts

Prompt copy should be explicit:

- “App X wants to write to your clipboard.”
- Buttons: Allow once / Always allow / Deny
- Show the requesting origin.

### 11.3 Failure states

- Manifest not found (404): show suggested paths.
- Invalid JSON: show line/parse error.
- entry.url not https: reject with clear error.
- Origin mismatch (runtime): close window + warn user.
- GitHub rate limit: show “try again later” with cached results.

## 12. Functional requirements (acceptance criteria)

FR‑1 Catalog loads curated registry

- Given Windows15 is loaded
- When user opens App Store
- Then curated apps render within 1 second (from cache if previously fetched)

FR‑2 Install from catalog

- When user clicks Install
- Then app appears in Installed list and Start menu
- And launching opens a window with the app iframe

FR‑3 Install from GitHub repo URL

- When user pastes a GitHub repo URL and clicks Install
- Then Windows15 fetches `/windows15.app.json` via GitHub API
- And installs successfully or shows actionable errors

FR‑4 Permission gating

- When an app calls `clipboardWrite`
- Then host prompts if permission is `ask`
- And the decision is stored for that appId+origin

FR‑5 Origin enforcement

- When an installed app iframe sends a message from a different origin
- Then host ignores it and logs a security warning

FR‑6 Uninstall

- When user uninstalls an app
- Then its Start menu entry disappears
- And its stored permissions are removed
- And open windows for that app close

FR‑7 Manual update check

- When user clicks “Check for updates”
- Then Windows15 refetches the manifest from its source
- And shows “Update available” if version differs

## 13. Security requirements

1. Default deny for all capabilities.
2. Strict origin checks for postMessage (origin must equal installed entry origin).
3. Validate manifest fields:
    - `id` must be reverse-DNS style, lowercase, `[a-z0-9.-]+`
    - `entry.url` must be `https://`
    - `icons` must be relative or https
4. Iframe sandbox enabled for all external apps.
5. Do not expose host storage or tokens to iframe.
6. Audit: log denied/allowed requests locally.

## 14. Performance requirements

- Registry fetch cached; revalidate on user refresh.
- App Store UI remains responsive with 200+ catalog apps (virtualized list).
- Launching an iframe app should show a “loading” state immediately (< 100ms).

## 15. Telemetry and logging (local-only v1)

- Log install/uninstall/launch.
- Log permission prompts and decisions.
- Log origin mismatch events.

(If later you add optional sync/telemetry, keep it opt-in.)

## 16. Implementation plan (2 weeks)

Epic 1: Manifest + registry

- Define schemas in `/docs/appstore/`
- Build `appstore/registry.json`
- Create 3 sample external apps (separate repos) with manifests

Epic 2: Store UI + installed apps integration

- Catalog view + search + app detail page
- Install/uninstall flow to Dexie
- Start menu integration for installed apps

Epic 3: Web app runtime

- Iframe window type
- Sandbox + referrer policy
- Basic loading/error UI

Epic 4: Bridge + permissions

- postMessage envelope + routing
- Permission store + prompt UI
- Implement `openExternalUrl`, `notify`, `clipboardWrite`, `themeRead`

Epic 5: GitHub install flow

- Parse GitHub repo URL
- Fetch manifest via GitHub Contents API
- Cache and handle rate limiting

Epic 6: Update checks

- Manual “Check for updates”
- Optional “pin ref” for GitHub installs

## 17. Testing strategy

Unit tests (Vitest):

- Manifest validation
- Registry merge logic
- Permission decision logic
- GitHub URL parsing

Integration / E2E (Playwright recommended):

- Install from curated registry, launch, uninstall
- Install from GitHub repo (mock API responses)
- postMessage request triggers prompt and stores decision
- Origin mismatch ignored

Security test cases:

- App tries to call unknown bridge method → denied
- App sends messages with spoofed appId → denied
- Cross-origin iframe sends message → ignored

## 18. Risks and mitigations

Risk: Supply-chain changes (manifest or entry URL changes unexpectedly)  
Mitigation: show source + trust; allow pinning to ref; show update diff at least at version level.

Risk: GitHub API rate limiting breaks install flow  
Mitigation: caching; graceful error; allow “install by manifest URL” and curated registry.

Risk: iframe sandbox bypass or privilege escalation  
Mitigation: strict origin checks; deny by default; keep bridge narrow; avoid exposing sensitive APIs.

Risk: Users confuse “web app” with “trusted native”  
Mitigation: clear badges: “Web app (sandboxed)”; show origin.

## 19. Future enhancements (v2+)

- Module apps (trusted) with stricter distribution and signing
- App “capability packs” and richer OS APIs (file picker, local storage namespaces)
- Background update checks with user controls
- Community registry tooling and automated validation
- Optional worker-based proxying for CORS-safe APIs (only if aligned with security posture)

## 20. References

- GitHub Docs: Using CORS and JSONP to make cross-origin requests  
  https://docs.github.com/en/rest/using-the-rest-api/using-cors-and-jsonp-to-make-cross-origin-requests
- GitHub Docs: REST API “Getting started” example response includes `Access-Control-Allow-Origin: *`  
  https://docs.github.com/en/rest/using-the-rest-api/getting-started-with-the-rest-api
- web.dev: Sandboxed iframes  
  https://web.dev/articles/sandboxed-iframes
- web.dev: Same-origin policy  
  https://web.dev/articles/same-origin-policy
- MDN: `<iframe>` element and sandbox cautions  
  https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe
- MDN: CORS guide  
  https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
