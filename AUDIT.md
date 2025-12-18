# Windows 15 App Audit: OS Service Integration Plan

> **Generated**: December 18, 2025  
> **Session**: 40  
> **Scope**: 28 applications in `/apps`

## Executive Summary

An audit of all applications in the Windows 15 project revealed significant gaps in OS-level service integration. While core apps like **Notepad**, **Terminal**, and **Settings** demonstrate excellent use of system services, many utility apps operate in isolation. This document outlines a phased remediation plan to bring all apps up to a consistent standard.

---

## Current State Overview

### Service Usage Heatmap

| Service       | Apps Using | Coverage    |
| :------------ | :--------: | :---------- |
| UI Framework  |   28/28    | ✅ Full     |
| DbContext     |   12/28    | 🟡 Partial  |
| Notification  |    8/28    | 🟡 Partial  |
| FileSystem    |    6/28    | 🔴 Low      |
| Localization  |    5/28    | 🔴 Low      |
| SoundService  |    2/28    | 🔴 Very Low |
| WindowContext |    0/28    | 🔴 None     |
| OSContext     |    4/28    | 🔴 Low      |

### Apps by Integration Level

**Well-Integrated (5+ services)**:

- Notepad, Terminal, Settings, GistExplorer, RecycleBin

**Partially Integrated (2-4 services)**:

- Browser, Calculator, Calendar, Clock, ColorPicker, TodoList, Weather, Arcade

**Isolated (0-1 services)**:

- Base64Tool, HashGenerator, IDBExplorer, ImageViewer, JsonViewer, Mail, PasswordGenerator, QrGenerator, SystemInfo, ThisPC, Timer, UnitConverter, WallpaperStudio, WordCounter, YoutubePlayer

---

## Phase 1: Foundation Services (Priority: Critical)

**Timeline**: 1-2 weeks  
**Goal**: Establish the core services that all apps will depend on.

### 1.1 LocalizationContext Enhancement

**Status**: Exists but underutilized  
**Current Usage**: Calendar, Clock, Terminal, Weather, ThisPC

**Tasks**:

- [ ] Audit all hardcoded strings in each app
- [ ] Create `locales/en.json` with all app strings
- [ ] Implement `useLocalization()` hook if not already present
- [ ] Add language switcher to Settings > Localization

**Affected Apps** (23 apps need localization):

```
Base64Tool, Browser, Calculator, ColorPicker, GistExplorer,
HashGenerator, IDBExplorer, ImageViewer, JsonViewer, Mail,
Notepad, PasswordGenerator, QrGenerator, RecycleBin, Settings,
SystemInfo, Timer, TodoList, UnitConverter, WallpaperStudio,
WordCounter, YoutubePlayer, Arcade
```

### 1.2 SoundService Standardization

**Status**: Exists, used only in Settings  
**Current Usage**: Settings (SoundSettings.tsx)

**Tasks**:

- [ ] Define standard system sounds enum:
    ```typescript
    type SystemSound =
        | 'success'
        | 'error'
        | 'warning'
        | 'notification'
        | 'delete'
        | 'empty-trash'
        | 'click'
        | 'complete';
    ```
- [ ] Create `useSound()` hook with `playSound(type: SystemSound)` method
- [ ] Add sound assets to `/public/sounds/`
- [ ] Integrate with user preferences (mute/volume from Settings)

**Priority Apps for Sound Integration**:
| App | Sound Events |
| :--- | :--- |
| RecycleBin | `empty-trash`, `delete` |
| Calculator | `error` (divide by zero) |
| Timer | `complete` (alarm) |
| TodoList | `complete` (task done) |
| Notepad | `delete` (note deleted) |

### 1.3 WindowContext Enhancement

**Status**: Exists but not consumed by apps  
**Current Usage**: None

**Tasks**:

- [ ] Extend `WindowContext` to expose:
    ```typescript
    interface WindowMethods {
        setTitle: (title: string) => void;
        setIcon: (iconUrl: string) => void;
        setBadge: (count: number | null) => void;
    }
    ```
- [ ] Pass methods to apps via props or context
- [ ] Update Taskbar to display badges

**Priority Apps for Window Title**:
| App | Dynamic Title Pattern |
| :--- | :--- |
| Notepad | `Notepad - {filename}` |
| Mail | `Mail - Inbox ({unreadCount})` |
| TodoList | `Todo List ({remainingCount})` |
| ImageViewer | `Image Viewer - {filename}` |
| Terminal | `Terminal - {currentPath}` |

---

## Phase 2: Data & Persistence (Priority: High)

**Timeline**: 2-3 weeks  
**Goal**: Migrate isolated apps to use DbContext for persistence and sync.

### 2.1 Migrate from localStorage to DbContext

**Affected Apps**:
| App | Current Storage | Migration Target |
| :--- | :--- | :--- |
| Mail | localStorage | `db.emails` table |
| GistExplorer | localStorage (PAT) | UserProfile or encrypted store |
| PasswordGenerator | usePersistentState | `db.settings` or user prefs |

**Tasks**:

- [ ] Create Dexie tables for Mail (`emails`, `folders`)
- [ ] Migrate GistExplorer PAT to UserProfileContext
- [ ] Ensure all migrations preserve existing user data

### 2.2 Add History/Persistence to Utility Apps

**Apps needing state persistence**:
| App | What to Persist |
| :--- | :--- |
| Base64Tool | Last input/output |
| HashGenerator | History of generated hashes |
| JsonViewer | Current document |
| QrGenerator | History of generated codes |
| WordCounter | Current text buffer |
| YoutubePlayer | Recently played videos |
| UnitConverter | Last selected category/units |

**Tasks**:

- [ ] Create `db.appState` table with `{ appId, state, updatedAt }`
- [ ] Create `useAppState(appId)` hook for simple get/set
- [ ] Implement in each utility app

---

## Phase 3: FileSystem Integration (Priority: High)

**Timeline**: 2-3 weeks  
**Goal**: Enable apps to interact with the virtual file system.

### 3.1 "Open With" Support

**Apps to register as file handlers**:
| App | File Extensions |
| :--- | :--- |
| Notepad | `.txt`, `.md`, `.json`, `.log` |
| ImageViewer | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg` |
| JsonViewer | `.json` |
| YoutubePlayer | `.yturl` (custom) |

**Tasks**:

- [ ] Extend app registry with `fileAssociations` property
- [ ] Update File Explorer to use associations for "Open" action
- [ ] Pass file path to app via launch params

### 3.2 Open/Save Dialogs for Utility Apps

**Apps needing file dialogs**:
| App | Actions |
| :--- | :--- |
| Base64Tool | Open file to encode, Save decoded output |
| HashGenerator | Open file to hash |
| JsonViewer | Open/Save JSON files |
| QrGenerator | Save QR code to Pictures folder |
| WordCounter | Open text file |
| ColorPicker | Export/Import palette as JSON |
| Calendar | Import/Export ICS files |

**Tasks**:

- [ ] Create `useFilePicker()` hook with `open()` and `save()` methods
- [ ] Implement file picker modal component
- [ ] Integrate with each app's toolbar

---

## Phase 4: Notification & Feedback (Priority: Medium)

**Timeline**: 1-2 weeks  
**Goal**: Standardize user feedback across all apps.

### 4.1 Notification Service Expansion

**Apps needing notifications**:
| App | Notification Events |
| :--- | :--- |
| Timer | "Timer complete!" (with sound) |
| Calendar | "Event starting in 5 minutes" |
| Mail | "New message received" |
| GistExplorer | "Sync complete" / "Sync failed" |
| TodoList | "3 tasks overdue" |

**Tasks**:

- [ ] Ensure `useNotification()` supports scheduling
- [ ] Add notification permission request flow
- [ ] Create notification center in taskbar

### 4.2 Confirmation Dialogs

**Apps needing confirm dialogs**:
| App | Confirmation Needed |
| :--- | :--- |
| Arcade | Delete game |
| Calendar | Delete event |
| Notepad | Discard unsaved changes |
| TodoList | Clear all completed tasks |

**Tasks**:

- [ ] Audit all destructive actions
- [ ] Ensure `useConfirm()` is used consistently

---

## Phase 5: New Services (Priority: Low)

**Timeline**: 3-4 weeks  
**Goal**: Introduce new OS-level services to fill gaps.

### 5.1 SystemInfoService

**Purpose**: Centralized provider for dynamic system information.

**Interface**:

```typescript
interface SystemInfo {
    osVersion: string;
    osBuild: string;
    uptime: number;
    cpuCores: number;
    memoryTotal: number;
    memoryUsed: number;
    storageUsed: number;
    storageTotal: number;
    networkStatus: 'online' | 'offline';
}
```

**Consumers**: SystemInfo, ThisPC, Terminal (`ver`, `hostname`)

**Tasks**:

- [ ] Create `SystemInfoContext` with polling for dynamic values
- [ ] Migrate SystemInfo app to consume context
- [ ] Migrate ThisPC app to consume context
- [ ] Update Terminal `ver` and `hostname` commands

### 5.2 NetworkContext

**Purpose**: Real-time network status and information.

**Interface**:

```typescript
interface NetworkInfo {
    isOnline: boolean;
    effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
    ip: string | null;
    latency: number | null;
}
```

**Consumers**: Settings (Network section), Terminal (`ping`, `ipconfig`)

**Tasks**:

- [ ] Create `NetworkContext` using Navigator.connection API
- [ ] Implement Settings > Network section
- [ ] Add `ping` and `ipconfig` commands to Terminal

### 5.3 ClipboardService Enhancement

**Purpose**: Centralized clipboard with history.

**Interface**:

```typescript
interface ClipboardService {
    copy: (text: string, type?: 'text' | 'image') => Promise<void>;
    paste: () => Promise<string>;
    history: ClipboardItem[];
    clear: () => void;
}
```

**Consumers**: All apps with copy functionality

**Tasks**:

- [ ] Create `ClipboardContext` with history storage
- [ ] Add clipboard history viewer (Ctrl+Shift+V)
- [ ] Migrate apps from direct `navigator.clipboard` calls

---

## Implementation Checklist by App

### Utility Apps (Isolated → Integrated)

| App               |       Phase 1       |   Phase 2   |       Phase 3       |   Phase 4    |
| :---------------- | :-----------------: | :---------: | :-----------------: | :----------: |
| Base64Tool        |    Localization     |  AppState   |    FileOpen/Save    |      -       |
| HashGenerator     | Localization, Sound |   History   |      FileOpen       |      -       |
| JsonViewer        |    Localization     | Persistence |    FileOpen/Save    |      -       |
| PasswordGenerator | Localization, Sound |      -      |     FileExport      | Notification |
| QrGenerator       | Localization, Sound |   History   |      FileSave       | Notification |
| UnitConverter     |    Localization     |  LastUsed   |          -          |      -       |
| WordCounter       |    Localization     | Persistence |      FileOpen       |      -       |
| Timer             | Localization, Sound | Persistence |          -          | Notification |
| ImageViewer       |    Localization     | RecentFiles | FileOpen, Wallpaper |      -       |
| YoutubePlayer     |    Localization     |   History   |          -          |      -       |

### Core Apps (Enhance Existing)

| App      | Enhancements                            |
| :------- | :-------------------------------------- |
| Notepad  | WindowTitle, Sound                      |
| Terminal | UserProfile (whoami), SystemInfo (ver)  |
| Settings | NetworkContext, AppRegistry             |
| Mail     | DbContext migration, Sound, UserProfile |
| Calendar | Notification scheduling, Sound          |
| Arcade   | Notification, Localization              |

---

## Success Metrics

| Metric                   |   Current   |    Target    |
| :----------------------- | :---------: | :----------: |
| Apps using DbContext     | 12/28 (43%) | 24/28 (86%)  |
| Apps using Localization  | 5/28 (18%)  | 28/28 (100%) |
| Apps using SoundService  |  2/28 (7%)  | 15/28 (54%)  |
| Apps using WindowContext |  0/28 (0%)  | 10/28 (36%)  |
| Apps with FileSystem     | 6/28 (21%)  | 18/28 (64%)  |

---

## Appendix: Quick Reference

### Hooks to Implement/Enhance

```typescript
// Phase 1
useLocalization(namespace?: string): { t: (key: string) => string }
useSound(): { play: (sound: SystemSound) => void }
useWindow(): { setTitle, setIcon, setBadge }

// Phase 2
useAppState<T>(appId: string, defaultState: T): [T, (state: T) => void]

// Phase 3
useFilePicker(): { open, save, getAssociatedApp }

// Phase 5
useSystemInfo(): SystemInfo
useNetwork(): NetworkInfo
useClipboard(): ClipboardService
```

### Dexie Tables to Add

```typescript
// db.ts additions
appStates: '++id, appId, &[appId], updatedAt',
emails: '++id, folderId, from, to, subject, date, read',
emailFolders: '++id, name, type',
clipboardHistory: '++id, content, type, timestamp',
```

---

## Next Steps

1. **Immediate**: Start Phase 1.1 (Localization) with a pilot app (e.g., Calculator)
2. **This Week**: Implement `useSound()` hook and integrate with RecycleBin
3. **Next Week**: Begin Phase 2 migrations for Mail app
4. **Ongoing**: Track progress in this document, updating checkboxes as tasks complete
