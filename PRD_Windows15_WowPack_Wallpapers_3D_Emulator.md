# Windows15 PRD — Wow Pack: Live Wallpapers (WebGPU), 3D Window Space, Retro Emulator Corner (WASM-4)

Version: 0.1  
Date: 2025-12-14  
Repository: https://github.com/ThomasRohde/windows15  
Scope: Implement three “wow” experiences inside Windows15: (9) Live Desktop Wallpapers, (10) 3D Window Space mode, (15) Retro Emulator Corner.

---

## 1. Executive summary

Windows15 already nails the “desktop-in-the-browser” vibe. This PRD adds a **Wow Pack** focused on visceral “how is this a web page?!” moments while staying compatible with **static hosting (GitHub Pages)** and an **offline-first** UX.

Deliverables:

- **Wallpaper Studio**: interactive/live wallpapers (GPU shaders + scenes) with audio-reactive modes and performance controls.
- **3D Window Space**: optional 3D depth/perspective mode + overview/exposé, built on existing window manager primitives.
- **Arcade**: a retro corner using a **fantasy console** runtime (MVP: **WASM-4**) with game library + save states.

---

## 2. Goals and success metrics

Goals:

1. Make Windows15 feel “premium” and technically impressive within 30 seconds of use.
2. Keep features “local-first” (IndexedDB/Dexie), compatible with GitHub Pages, and safe to run without backend.
3. Keep the changes modular: each feature is an app + small shared platform additions.

Success metrics (pragmatic):

- P95 desktop frame time remains smooth: **3D mode OFF** should not regress baseline UX.
- Live wallpaper runs stable for 10 minutes without memory growth that impacts interaction.
- Arcade runs included demo carts at stable speed and saves restore reliably.

Non-goals:

- Not attempting a full native-like compositor. (We will use CSS transforms + optional canvas layers.)
- Not distributing copyrighted ROMs or BIOS files.
- Not guaranteeing identical performance across all devices/browsers (progressive enhancement).

---

## 3. Assumptions and constraints

- **Deployment**: static site (GitHub Pages) with Service Worker for offline caching.
- **Storage**: IndexedDB (Dexie) is the persistence layer; avoid server dependencies.
- **Progressive enhancement**:
    - WebGPU where supported.
    - WebGL2 fallback for wallpapers if WebGPU is unavailable.
    - Reduced Motion support for 3D mode.
- **Security**: treat imported content as untrusted (especially WASM game carts).

---

## 4. User stories (high-level)

Wallpaper Studio

- As a user, I can pick a live wallpaper from a gallery and it becomes my desktop background.
- As a user, I can toggle “Audio Reactive” and the wallpaper responds to sound input.
- As a user, I can enable “Battery Saver” to cap FPS and reduce GPU usage.
- As a creator (you), I can add new wallpapers as a folder with a manifest and assets.

3D Window Space

- As a user, I can toggle 3D mode and windows gain depth and subtle perspective.
- As a user, I can enter “Overview” and quickly select a window (exposé).
- As a user, I can still tile/snap windows; 3D mode is visual, not functional breakage.

Arcade

- As a user, I can open “Arcade”, run a built-in demo game, and save/load my progress.
- As a user, I can import a supported game cartridge file into my library.
- As a user, I can map controls (keyboard/gamepad) and it persists.

---

## 5. UX overview

### 5.1 Wallpaper Studio (new app)

Primary screens:

- Gallery: tiles with preview thumbnails, tags, and “Set as wallpaper”.
- Details: preview, settings (quality, FPS cap, audio reactive, intensity).
- Creator view (optional): “Install wallpaper pack” from a local folder/zip.

Desktop integration:

- Desktop background becomes a **render layer** behind icons/windows.
- Wallpaper persists across reloads from Dexie settings.

### 5.2 3D Window Space (system mode + optional overview UI)

Entry points:

- Quick Settings toggle (“3D Space”).
- Keyboard shortcut: `Ctrl+Alt+3` toggle 3D mode (configurable).
- Overview: `Ctrl+Tab` or `Alt+Space` → “Overview” action.

Overview behavior:

- Freeze wallpaper animation or dim it.
- Arrange live window thumbnails in a grid with subtle depth.
- Click/Enter to focus a window; Esc exits overview.

### 5.3 Arcade (new app)

Primary screens:

- Library: installed carts, last played, favorites.
- Player: emulator canvas + overlay controls + save/load.
- Settings: key mapping, gamepad mapping, scaling (integer scaling), audio.

---

## 6. Functional requirements

### 6.1 Live Desktop Wallpapers (Idea #9)

#### 6.1.1 Wallpaper types (MVP)

Support **two** wallpaper runtime types:

1. **Shader wallpaper** (recommended MVP): fragment shader driven visuals
2. **Scene wallpaper** (optional for MVP): lightweight 2D/3D scene with simple objects

Wallpaper packs ship in-repo as “built-in” and can be installed by dropping a zip (optional stretch).

#### 6.1.2 Wallpaper pack format

Each wallpaper pack is a folder with:

- `wallpaper.json` (manifest)
- assets (textures, audio samples, small models)

Example `wallpaper.json`:

```json
{
    "id": "aurora-shader",
    "name": "Aurora",
    "type": "shader",
    "entry": "aurora.wgsl",
    "fallback": "aurora.glsl",
    "preview": "preview.png",
    "tags": ["neon", "smooth"],
    "defaultSettings": {
        "intensity": 0.7,
        "fpsCap": 60,
        "audioReactive": false
    }
}
```

#### 6.1.3 Desktop wallpaper renderer API (internal)

Define an internal interface used by the desktop layer:

```ts
type WallpaperSettings = {
    intensity: number; // 0..1
    fpsCap: number; // 15, 30, 60
    quality: 'low' | 'med' | 'high';
    audioReactive: boolean;
    micSensitivity: number; // 0..1
};

interface WallpaperRuntime {
    init(ctx: { canvas: HTMLCanvasElement | OffscreenCanvas; settings: WallpaperSettings }): Promise<void>;

    resize(width: number, height: number, dpr: number): void;
    setSettings(settings: WallpaperSettings): void;

    // called by scheduler; runtime decides if it draws
    render(nowMs: number): void;

    dispose(): void;
}
```

#### 6.1.4 Audio reactive mode

- Audio reactive uses **microphone input** (Web Audio + `getUserMedia`).
- Permission requested only when user enables “Audio Reactive”.
- Analyzer provides smoothed bands (bass/mid/treble) to wallpaper runtime.
- Provide a safe fallback if mic denied: “Audio Reactive not available” + keep wallpaper running non-reactive.

#### 6.1.5 Performance and quality controls

- FPS cap: 15/30/60.
- “Battery Saver”: auto caps to 30, reduces resolution (render to smaller offscreen buffer and upscale).
- “Pause when hidden”: pause animation when tab not visible or desktop hidden behind overview.
- Prefer **OffscreenCanvas + Worker** when available:
    - Worker owns draw loop and GPU/WebGL context when feasible.
    - Main thread receives only minimal input updates (resize/settings/audio bands).

Acceptance criteria:

- A wallpaper can run continuously while moving windows without the UI becoming unresponsive.
- Switching wallpapers does not require page refresh; prior runtime is disposed.

---

### 6.2 3D Window Space (Idea #10)

#### 6.2.1 Mode toggle and settings

Add global settings:

- `ui.windowSpaceMode`: `"flat" | "3d"`
- `ui.motion`: `"full" | "reduced"` (respects `prefers-reduced-motion`)
- `ui.perspective`: default 900–1400px
- `ui.tiltOnDrag`: boolean
- `ui.depthIntensity`: 0..1

#### 6.2.2 Visual behavior in 3D mode

- Desktop root gets CSS perspective: `perspective: var(--perspective)`
- Each window gets a Z offset based on focus order (or explicit depth stack)
- Subtle parallax/tilt on drag:
    - while dragging: rotateX/rotateY based on pointer delta
    - on drop: animate back to neutral

Depth model (simple):

- Focused window: z=0, scale=1.0
- Others: z=-N \* depthStep, slight scale down (optional)
- Window shadows increase with depth

#### 6.2.3 Overview (Exposé) mode

Add an overview surface that:

- Gathers all open windows and produces **live thumbnails**
- Arranges them in a responsive grid
- Allows keyboard navigation (arrow keys) + Enter to focus

Implementation detail:

- If live thumbnails are expensive, fall back to **static snapshots**:
    - Use `html2canvas`-style snapshotting is heavy; better:
        - snapshot window root to `canvas` where possible, or
        - render simplified “window card” with app icon + title + last frame (for canvas-backed apps)
- MVP can use simplified cards; “live thumbnails” becomes v2.

#### 6.2.4 Interaction invariants (must not break)

- Dragging, resizing, focusing works exactly as in flat mode.
- Z-order logic remains authoritative; 3D is purely a transform layer.
- Snap/tile features behave the same.

Acceptance criteria:

- 3D toggle is instantaneous (no reload).
- Reduced motion mode turns off tilt and uses minimal transitions.
- Overview opens/closes without losing window state or focus history.

---

### 6.3 Retro Emulator Corner (Idea #15)

#### 6.3.1 MVP choice: WASM-4 runtime

MVP will embed a **WASM-4** runtime in a dedicated app:

- Supports running `.wasm` carts
- Provides consistent input model (4 buttons + d-pad) and a fixed resolution framebuffer

Rationale:

- A “fantasy console” avoids ROM legality problems and keeps scope tight.
- Carts are small, self-contained files (good for offline caching + fast load).

#### 6.3.2 Library management

- Built-in demo carts shipped in-repo (open-licensed only).
- Import flow:
    - user selects a `.wasm` cart file
    - app validates file size (e.g., <= 5–10 MB) and stores in IndexedDB
    - user assigns title, icon (optional), tags

Data stored per game:

- id, title, cartridge bytes (or blob ref), last played timestamp
- settings overrides (key mapping, scaling, audio)

#### 6.3.3 Player features (MVP)

- Run / Pause / Reset
- Save / Load (at least 3 slots per game)
- Fullscreen mode
- Integer scaling / fit-to-window scaling
- Keyboard mapping preset + remap UI
- Gamepad support (Gamepad API)

Save state approach:

- Prefer runtime-provided save state if available.
- If not, implement “snapshot” states by saving the runtime memory buffer + metadata (if accessible).
- If full save state is not feasible for MVP, support **in-game save** only and label “Save States” as v2.

#### 6.3.4 Safety and legal considerations

- No ROM distribution.
- If later adding multi-system emulation (e.g., RetroArch cores / EmulatorJS), restrict to **user-provided ROMs** with an explicit disclaimer screen and opt-in.

Acceptance criteria:

- Built-in cart launches and runs smoothly.
- Imported cart persists and is playable after reload.
- Save/load works reliably for at least one supported save mechanism.

---

## 7. Technical design

### 7.1 Proposed folder structure

```
src/
  apps/
    wallpaper-studio/
      WallpaperStudioApp.tsx
      packs/                 # built-in wallpaper packs
      runtime/               # shader/webgpu/webgl runtimes
    arcade/
      ArcadeApp.tsx
      runtime/wasm4/
      demo-carts/
  platform/
    desktop/
      wallpaper/
        WallpaperHost.ts
        WallpaperScheduler.ts
      window-space/
        WindowSpaceMode.ts
        OverviewMode.tsx
    storage/
      db.ts                  # Dexie setup + tables
    audio/
      AudioAnalyzer.ts
```

### 7.2 Storage model (Dexie)

Add tables (names illustrative):

- `settings`:
    - key: string
    - value: any (JSON)
- `wallpapers`:
    - id, name, type, manifest, installedAt
- `wallpaperAssets`:
    - wallpaperId, path, blob
- `arcadeGames`:
    - id, title, type="wasm4", cartridgeBlob, iconBlob?, tags[], lastPlayedAt
- `arcadeSaves`:
    - gameId, slot, createdAt, dataBlob, meta

### 7.3 Rendering strategy

Wallpaper:

- Prefer WebGPU (WGSL shaders) when available.
- WebGL2 fallback using GLSL fragment shaders.
- Provide a tiny uniform convention: time, resolution, audio bands, mouse position (optional).

3D Window Space:

- CSS 3D transforms applied to window root elements.
- Single source of truth remains existing window state (position, size, z-order).
- Add a “presentational layer” that maps state → transform.

Arcade:

- WASM runtime runs in main thread for MVP (simpler).
- If performance issues arise, move runtime to a Worker and render via OffscreenCanvas.

### 7.4 Service Worker + offline

- Cache:
    - app shell (HTML/CSS/JS bundles)
    - built-in wallpaper packs, demo carts
- Do not aggressively cache user imports (store in IndexedDB instead).

---

## 8. Accessibility and UX quality

- Respect `prefers-reduced-motion`:
    - disable tilt, minimize transitions, optional automatic fallback to flat mode.
- Keyboard navigation:
    - overview mode must be fully navigable.
- “Power user” shortcuts should be discoverable (Help panel / Command palette later).

---

## 9. Security considerations

- Wallpaper packs: only allow installation from local files (optional). Validate manifest fields; limit asset sizes.
- Arcade carts (WASM):
    - enforce max size
    - run in browser’s WASM sandbox; still treat as untrusted content
    - implement “panic button” (Stop) if a cart hangs: terminate worker or reset runtime.
- Microphone access:
    - request permission only on explicit user action
    - show clear indicator when mic is active
    - allow disabling mic at any time

---

## 10. Testing strategy

Unit tests:

- Settings serialization and migration
- Manifest validation
- Audio analyzer smoothing logic
- Window transform mapping (state → CSS transform)

Integration tests (manual + automated where feasible):

- Toggle 3D mode during active dragging/resizing.
- Switch wallpapers repeatedly; verify disposal and no memory spikes.
- Import cart, reload app, run cart again.
- Offline mode: first load online, then airplane mode, verify apps still work.

---

## 11. Milestones and delivery plan

Milestone 1 — Foundations (1–2 weeks)

- Dexie schema updates for wallpapers + arcade
- WallpaperHost integrated into desktop behind windows
- Basic 3D toggle applying transforms (no overview yet)

Milestone 2 — Wallpaper Studio MVP (1–2 weeks)

- Gallery + built-in shader wallpapers
- Settings (fps cap, intensity)
- WebGL fallback
- Optional audio reactive

Milestone 3 — 3D Window Space MVP (1–2 weeks)

- Polished depth/tilt behavior
- Reduced motion handling
- Overview mode (simple cards)

Milestone 4 — Arcade MVP (1–2 weeks)

- WASM-4 runtime integration
- Demo carts + import
- Persistence + basic save/load (as supported)

Milestone 5 — Polish (ongoing)

- Performance tuning, better previews, more wallpapers, UX refinements

---

## 12. Backlog (nice-to-have / v2)

Wallpaper Studio

- Online wallpaper gallery (requires backend / CORS strategy)
- “Wallpaper editor” with live shader editing + presets
- Wallpaper reacts to window activity (e.g., particles when apps open)

3D Window Space

- True live thumbnails in overview
- Spatial window grouping (workspaces) with 3D “rooms”
- Fancy transitions (only in full motion mode)

Arcade

- Additional engines (opt-in): multi-system emulation with user-provided ROMs only
- Cloud sync of saves (optional, BYO provider)
- Achievements and shareable replays

---

## 13. Open questions

1. Which WebGPU abstraction to use for shader wallpapers?
    - Option A: minimal custom WebGPU pipeline (best control)
    - Option B: Three.js WebGPU renderer for “scene wallpapers” (faster iteration, heavier bundle)

2. Do we want wallpaper rendering in a Worker for MVP?
    - Recommended: start main-thread MVP, then move to worker if needed.

3. Arcade save states feasibility with WASM-4 runtime in browser:
    - Confirm available hooks; otherwise, ship without save states and upgrade later.
