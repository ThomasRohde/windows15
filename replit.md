# Windows 15 Concept

## Overview

A futuristic Windows-style desktop UI simulation built as a single-page React application. The project recreates a complete desktop operating system experience in the browser, featuring a window manager, taskbar, start menu, widgets, and approximately 20+ demo applications. The design emphasizes glassmorphism aesthetics with blur effects, transparency, and modern visual styling.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 19 with TypeScript, bundled using Vite 6. The application is entirely client-side with no backend.

**State Management**: React Context API (`OSContext`) serves as the central state manager for the entire "operating system." This context handles:

- Window lifecycle (open, close, minimize, maximize, focus, z-index ordering)
- Application registry (dynamic app registration on boot)
- Global UI state (wallpaper, start menu visibility)

**Component Structure**:

- `App.tsx` - Root component that registers all applications on mount
- `components/` - Core OS UI components (Window, Taskbar, StartMenu, Widgets, DesktopIcon, FileExplorer)
- `apps/` - Individual application components (Browser, Calculator, Calendar, Mail, Notepad, Terminal, etc.)
- `context/` - React Context providers
- `utils/` - Shared utilities and constants

**Window Management**: Each window is a draggable, resizable container rendered by the `Window` component. Windows track position, size, z-index, and minimize/maximize state. Drag operations use pointer events with requestAnimationFrame for smooth updates.

**Styling Approach**: Tailwind CSS loaded via CDN with custom configuration in `index.html`. Custom CSS in `index.css` defines glassmorphism effects (`.glass-panel`, `.glass-card`) using backdrop-filter blur. Material Symbols (Google Fonts) provide iconography.

### Data Persistence

**Dexie (IndexedDB) + Optional Sync**: The `utils/storage/` modules provide an offline-first Dexie database with optional BYO Dexie Cloud sync. MVP tables:

- `kv` - key/value OS + app state (wallpaper, window layout, mail, calendar, etc.)
- `notes` - Notepad notes list (synced)
- `bookmarks` - Browser bookmarks (synced)

**IndexedDB File System**: The `utils/fileSystem.ts` module still provides the virtual filesystem backing File Explorer.

**Local Storage**: Used only for small bootstrap config (Dexie Cloud `databaseUrl`) and one-time legacy migration flags.

**Persistence Features**:

- File Explorer loads/saves files to IndexedDB with create folder and delete support
- Window positions and sizes persist across sessions (Dexie `kv`)
- Wallpaper choice persists across page refreshes (Dexie `kv`)
- Files seeded with INITIAL_FILES on first load

### Application Architecture

Applications are registered dynamically in `App.tsx` using `registerApp()`. Each app config includes:

- Unique ID, title, icon, and color
- React component to render
- Optional default window dimensions

Apps receive props from the window manager and can request to open other apps via the `useOS()` hook.

## Applications

The OS includes 22 demo applications:

**Original Apps:**

- File Explorer, Browser, Mail, Calendar, Calculator, Settings
- Notepad - Full-featured text editor with File menu (New, Open, Save, Save As), Edit menu, IndexedDB persistence, unsaved changes indicator

**Utility Apps:**

- Timer - Stopwatch and countdown timer with lap recording
- World Clock - Multiple timezone display with analog/digital views
- Unit Converter - Length, weight, temperature, and data conversions
- Weather - Mock weather display with 5-day forecast

**Text/Data Tools:**

- JSON Viewer - Parse, format, and explore JSON with tree view
- Word Counter - Character, word, sentence stats with reading time
- Base64 Tool - Encode/decode Base64 strings
- Hash Generator - MD5, SHA-1, SHA-256 hash generation

**Productivity Apps:**

- Todo List - Task management with filtering
- Password Generator - Secure password creation with strength indicator
- Color Picker - HSL sliders with HEX/RGB/HSL output
- QR Generator - Generate QR codes from text/URLs

**System Apps:**

- Terminal - Simulated command prompt with basic commands
- System Info - About Windows15 system information
- Image Viewer - View images with zoom controls

## External Dependencies

### Runtime Dependencies

- **React 19** - UI framework
- **React DOM 19** - DOM rendering

### Development Dependencies

- **Vite 6** - Build tool and dev server
- **TypeScript 5.8** - Type checking
- **@vitejs/plugin-react** - React Fast Refresh

### CDN Resources (loaded in index.html)

- **Tailwind CSS** - Utility-first styling (via CDN with plugins: forms, container-queries)
- **Google Fonts: Inter** - Primary display font
- **Google Fonts: Material Symbols Outlined** - Icon system

### External APIs/Services

- **Unsplash** - Wallpaper images loaded via direct URLs
- No backend services or databases - entirely client-side
