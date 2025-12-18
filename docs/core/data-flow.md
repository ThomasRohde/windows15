---
name: windows15-data-flow
description: Data flow diagrams for Windows 15 core services including DbContext, FileSystem, and notification pipeline.
load_when: You need to understand how data flows between contexts, the database, and services.
---

# Data Flow Architecture

## Overview

Windows 15 uses a layered architecture with React contexts managing OS-level state,
Dexie/IndexedDB for persistence, and service singletons for cross-cutting concerns.

## Provider Composition Hierarchy

The `OSProvider` composes all context providers in a specific order. Inner providers can access outer providers via hooks:

```mermaid
graph TB
    subgraph "App.tsx Entry Point"
        direction TB
        DbP[DbProvider]
        NP[NotificationProvider]
        UP[UserProfileProvider]
        OSP[OSProvider]

        DbP --> NP --> UP --> OSP
    end

    subgraph "OSProvider Composition"
        direction TB
        ARP[AppRegistryProvider]
        SMP[StartMenuProvider]
        LP[LocalizationProvider]
        WPP[WallpaperProvider]
        SSP[ScreensaverProvider]
        WSP[WindowSpaceProvider]
        SIP[SystemInfoProvider]
        NetP[NetworkProvider]
        CBP[ClipboardProvider]
        WinP[WindowProvider]
        Bridge[OSContextBridge]

        ARP --> SMP --> LP --> WPP --> SSP --> WSP --> SIP --> NetP --> CBP --> WinP --> Bridge
    end

    OSP --> ARP
```

## Context Dependency Graph

Shows which contexts depend on which other contexts and services:

```mermaid
graph LR
    subgraph "Data Layer"
        DB[(DbContext)]
        SS[SoundService]
        LS[LocalStorage]
    end

    subgraph "Core OS Contexts"
        WM[WindowContext]
        AR[AppRegistryContext]
        SM[StartMenuContext]
        WP[WallpaperContext]
    end

    subgraph "OS Service Contexts"
        SI[SystemInfoContext]
        NET[NetworkContext]
        CB[ClipboardContext]
        NC[NotificationContext]
        UP[UserProfileContext]
        SCR[ScreensaverContext]
    end

    %% DbContext dependencies
    NC -->|useLiveQuery| DB
    CB -->|clipboard history| DB
    UP -->|user settings| DB
    WM -->|window state| LS
    SCR -->|settings| DB
    WP -->|active wallpaper| DB

    %% Service dependencies
    NC -->|play sounds| SS
    SCR -->|idle detection| WM

    %% Context inter-dependencies
    WM -->|app lookup| AR
    SM -->|app registry| AR
```

## DbContext Data Flow

The database layer uses Dexie with cloud sync for persistence:

```mermaid
flowchart TB
    subgraph "Browser"
        App[App Components]
        Contexts[Context Providers]
        Hooks[Dexie Hooks]
    end

    subgraph "Dexie Layer"
        DB[(Windows15DexieDB)]
        LiveQuery[useLiveQuery]
    end

    subgraph "Storage"
        IDB[(IndexedDB)]
        Cloud[Dexie Cloud]
    end

    App --> Contexts
    Contexts --> |useDb| DB
    Contexts --> |useLiveQuery| LiveQuery
    LiveQuery --> |reactive queries| DB
    DB --> |persist| IDB
    DB <--> |sync| Cloud

    subgraph "Database Tables"
        direction LR
        Local[$-prefixed: local-only]
        Synced[No prefix: cloud-synced]
    end

    DB --> Local
    DB --> Synced
```

### Database Table Categories

| Prefix | Sync Behavior | Examples                                                               |
| ------ | ------------- | ---------------------------------------------------------------------- |
| None   | Cloud-synced  | `notes`, `todos`, `bookmarks`, `emails`, `notifications`               |
| `$`    | Local-only    | `$terminalHistory`, `$clipboardHistory`, `$wallpapers`, `$arcadeGames` |

## Notification Pipeline

Complete flow from notification trigger to user feedback:

```mermaid
sequenceDiagram
    participant App as App Component
    participant NC as NotificationContext
    participant DB as DbContext
    participant Sound as SoundService
    participant Browser as Browser API
    participant Toast as NotificationToast

    %% Immediate notification
    App->>NC: notify(title, message, options)
    NC->>DB: Insert NotificationRecord
    NC->>Sound: soundService.play('notification')
    Sound->>Sound: Play audio via Web Audio API

    alt Browser permission granted
        NC->>Browser: new Notification(...)
        Browser->>Browser: Show system notification
    end

    NC->>Toast: Trigger toast display
    Toast->>Toast: Show in-app notification

    %% Scheduled notification
    App->>NC: schedule(time, title, message)
    NC->>DB: Insert with scheduledFor
    NC->>NC: setTimeout for delay

    Note over NC: When time arrives...
    NC->>NC: triggerNotification()
    NC->>DB: Update triggeredAt
    NC->>Sound: soundService.play('notification')
    NC->>Browser: Show browser notification
```

## Sound Service Architecture

```mermaid
flowchart TB
    subgraph "Sound Sources"
        SS[SoundSettings in localStorage]
        Assets[/sounds/ directory]
    end

    subgraph "SoundService Singleton"
        Init[initialize]
        Play[play]
        Vol[setVolume]
        Mute[toggleMute]
        Cache[Audio cache]
    end

    subgraph "Web Audio API"
        AC[AudioContext]
        GN[GainNode]
        BS[BufferSource]
    end

    subgraph "Consumers"
        NC2[NotificationContext]
        Apps[App Components]
        OS[OS Events]
    end

    SS --> Init
    Assets --> Init
    Init --> Cache
    Init --> AC

    NC2 --> Play
    Apps --> Play
    OS --> Play

    Play --> Cache
    Cache --> BS
    BS --> GN
    GN --> AC

    Vol --> GN
    Mute --> GN
```

### Available System Sounds

| Sound ID       | Usage                    |
| -------------- | ------------------------ |
| `notification` | New notification arrival |
| `startup`      | OS startup               |
| `shutdown`     | OS shutdown              |
| `error`        | Error dialogs            |
| `click`        | UI interactions          |

## Clipboard Context Data Flow

```mermaid
flowchart LR
    subgraph "User Actions"
        Copy[Ctrl+C / context menu]
        Paste[Ctrl+V]
        History[Ctrl+Shift+V]
    end

    subgraph "ClipboardContext"
        CopyFn[copy]
        PasteFn[paste]
        HistoryFn[openHistory]
        Max25[Max 25 items]
    end

    subgraph "Browser APIs"
        ClipAPI[Clipboard API]
    end

    subgraph "Persistence"
        DB2[($clipboardHistory)]
    end

    Copy --> CopyFn
    CopyFn --> ClipAPI
    CopyFn --> DB2
    DB2 --> Max25

    Paste --> PasteFn
    PasteFn --> ClipAPI

    History --> HistoryFn
    HistoryFn --> |fetch| DB2
    DB2 --> |display| Modal[ClipboardHistoryViewer]
    Modal --> |paste from| PasteFn
```

## SystemInfo Context Data Sources

```mermaid
flowchart TB
    subgraph "Browser APIs"
        Nav[navigator]
        Perf[performance]
        Store[StorageManager]
        Batt[BatteryManager]
    end

    subgraph "SystemInfoContext"
        SI2[useSystemInfo hook]
    end

    subgraph "Computed Metrics"
        OS[osVersion, osBuild]
        CPU[cpuCores, cpuPercent]
        Mem[memoryTotal, memoryUsed]
        Stor[storageTotal, storageUsed]
        Net[networkStatus]
        Up[uptime, uptimeFormatted]
        Bat[batteryLevel, batteryCharging]
    end

    Nav -->|hardwareConcurrency| CPU
    Nav -->|deviceMemory| Mem
    Nav -->|connection| Net
    Nav -->|language, platform| OS
    Store -->|estimate| Stor
    Batt -->|level, charging| Bat
    Perf -->|timeOrigin| Up

    CPU --> SI2
    Mem --> SI2
    Stor --> SI2
    Net --> SI2
    Up --> SI2
    OS --> SI2
    Bat --> SI2
```

## Network Context Data Sources

```mermaid
flowchart LR
    subgraph "Browser APIs"
        Online[navigator.onLine]
        NetInfo[NetworkInformation API]
        Fetch[fetch API]
    end

    subgraph "NetworkContext"
        NCtx[useNetwork hook]
    end

    subgraph "Provided Values"
        IsOnline[isOnline]
        Type[effectiveType]
        Down[downlink]
        RTT[rtt]
        Save[saveData]
        Lat[latency]
    end

    Online --> IsOnline
    NetInfo -->|type| Type
    NetInfo -->|downlink| Down
    NetInfo -->|rtt| RTT
    NetInfo -->|saveData| Save
    Fetch -->|measureLatency| Lat

    IsOnline --> NCtx
    Type --> NCtx
    Down --> NCtx
    RTT --> NCtx
    Save --> NCtx
    Lat --> NCtx
```

## Next

- State management overview: `core/state-management.md`
- Window lifecycle: `core/window-lifecycle.md`
- App architecture: `core/app-architecture.md`
