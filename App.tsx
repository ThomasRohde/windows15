import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
    AriaLiveProvider,
    DesktopIcon,
    Widgets,
    Taskbar,
    Window,
    StartMenu,
    PWAUpdatePrompt,
    ReconnectingToast,
    NotificationToast,
    OverviewMode,
    InstallButton,
    Screensaver,
    WallpaperHost,
} from './components';
import { OSProvider, useOS, DbProvider, useDb, useWindowSpace } from './context';
import { useDexieLiveQuery } from './utils/storage/react';
import { DesktopIconRecord } from './utils/storage/db';
import { APP_REGISTRY } from './apps';
import { useHotkeys } from './hooks';
import { appEventBus } from './utils/eventBus';

const Desktop = () => {
    const {
        windows,
        openWindow,
        closeWindow,
        minimizeWindow,
        focusWindow,
        registerApp,
        activeWallpaper,
        isStartMenuOpen,
        closeStartMenu,
    } = useOS();
    const { is3DMode, settings: windowSpaceSettings, toggle3DMode } = useWindowSpace();
    const db = useDb();

    // Overview mode state (F095)
    const [isOverviewOpen, setIsOverviewOpen] = useState(false);

    // Calculate max z-index for 3D depth calculations
    const maxZIndex = useMemo(() => {
        if (windows.length === 0) return 0;
        return Math.max(...windows.map(w => w.zIndex));
    }, [windows]);

    // Load desktop icons reactively
    const { value: iconsRaw, isLoading: iconsLoading } = useDexieLiveQuery(
        () => db.desktopIcons.orderBy('order').toArray(),
        [db]
    );
    const icons = Array.isArray(iconsRaw) ? iconsRaw : [];

    // Initialize default icons if none exist
    useEffect(() => {
        const initializeIcons = async () => {
            const count = await db.desktopIcons.count();
            console.log('[Desktop Icons] Count:', count, 'Icons loaded:', icons.length);
            if (count === 0) {
                console.log('[Desktop Icons] Initializing default icons...');
                const now = Date.now();
                // Dexie Cloud requires globally unique IDs - omit 'id' to let Dexie auto-generate
                const defaultIconsData = [
                    {
                        label: 'This PC',
                        icon: 'computer',
                        colorClass: 'text-blue-300',
                        appId: 'explorer',
                        position: { x: 20, y: 24 },
                        order: 0,
                        createdAt: now,
                        updatedAt: now,
                    },
                    {
                        label: 'Documents',
                        icon: 'folder_open',
                        colorClass: 'text-yellow-300',
                        appId: 'explorer',
                        position: { x: 20, y: 140 },
                        order: 1,
                        createdAt: now,
                        updatedAt: now,
                    },
                    {
                        label: 'Browser',
                        icon: 'public',
                        colorClass: 'text-green-300',
                        appId: 'browser',
                        position: { x: 20, y: 256 },
                        order: 2,
                        createdAt: now,
                        updatedAt: now,
                    },
                    {
                        label: 'Terminal',
                        icon: 'terminal',
                        colorClass: 'text-green-400',
                        appId: 'terminal',
                        position: { x: 20, y: 372 },
                        order: 3,
                        createdAt: now,
                        updatedAt: now,
                    },
                    {
                        label: 'Timer',
                        icon: 'timer',
                        colorClass: 'text-red-300',
                        appId: 'timer',
                        position: { x: 140, y: 24 },
                        order: 4,
                        createdAt: now,
                        updatedAt: now,
                    },
                    {
                        label: 'JSON Viewer',
                        icon: 'data_object',
                        colorClass: 'text-amber-300',
                        appId: 'jsonviewer',
                        position: { x: 140, y: 140 },
                        order: 5,
                        createdAt: now,
                        updatedAt: now,
                    },
                    {
                        label: 'Todo List',
                        icon: 'checklist',
                        colorClass: 'text-lime-300',
                        appId: 'todolist',
                        position: { x: 140, y: 256 },
                        order: 6,
                        createdAt: now,
                        updatedAt: now,
                    },
                    {
                        label: 'Recycle Bin',
                        icon: 'delete',
                        colorClass: 'text-gray-300',
                        appId: 'recyclebin',
                        position: { x: 140, y: 372 },
                        order: 7,
                        createdAt: now,
                        updatedAt: now,
                    },
                ];
                // Add each icon individually to let Dexie Cloud generate unique IDs
                for (const iconData of defaultIconsData) {
                    await db.desktopIcons.add(iconData as DesktopIconRecord);
                }
                console.log('[Desktop Icons] Default icons added!');
            }
        };
        initializeIcons().catch(err => {
            console.error('[Desktop Icons] Initialization error:', err);
        });
    }, [db]);

    // Handle icon position changes - memoized for DesktopIcon optimization
    const handleIconPositionChange = useCallback(
        async (id: string, position: { x: number; y: number }) => {
            await db.desktopIcons.update(id, { position, updatedAt: Date.now() });
        },
        [db]
    );

    // Register all applications from registry on boot
    useEffect(() => {
        APP_REGISTRY.forEach(app => {
            registerApp({
                id: app.id,
                title: app.title,
                icon: app.icon,
                color: app.color,
                component: app.component,
                defaultWidth: app.defaultWidth,
                defaultHeight: app.defaultHeight,
            });
        });
    }, []);

    // Global keyboard shortcuts
    // Find the focused (topmost) window for window shortcuts
    const focusedWindow = useMemo(() => {
        const nonMinimized = windows.filter(w => !w.isMinimized);
        if (nonMinimized.length === 0) return null;
        return nonMinimized.reduce((top, w) => (w.zIndex > top.zIndex ? w : top));
    }, [windows]);

    // Overview mode handlers (F095)
    const openOverview = useCallback(() => {
        setIsOverviewOpen(true);
        closeStartMenu();
    }, [closeStartMenu]);

    const closeOverview = useCallback(() => {
        setIsOverviewOpen(false);
    }, []);

    const handleOverviewSelect = useCallback(
        (windowId: string) => {
            focusWindow(windowId);
            setIsOverviewOpen(false);
        },
        [focusWindow]
    );

    useHotkeys({
        // App launcher shortcuts
        'ctrl+shift+e': () => openWindow('explorer'),
        'ctrl+shift+t': () => openWindow('terminal'),
        'ctrl+shift+n': () => openWindow('notepad'),
        'ctrl+shift+c': () => openWindow('calculator'),
        'ctrl+shift+s': () => openWindow('settings'),
        // Window control shortcuts
        'ctrl+w': () => focusedWindow && closeWindow(focusedWindow.id),
        'alt+f4': () => focusedWindow && closeWindow(focusedWindow.id),
        'ctrl+m': () => focusedWindow && minimizeWindow(focusedWindow.id),
        // 3D Window Space toggle (F103)
        'ctrl+alt+3': () => {
            toggle3DMode();
            const newMode = !is3DMode ? '3D' : 'Flat';
            appEventBus.emit('notification:show', {
                message: `Window Space: ${newMode} Mode`,
                type: 'info',
                duration: 2000,
            });
        },
        // Overview mode (F095)
        'ctrl+tab': () => openOverview(),
        'alt+space': () => openOverview(),
    });

    // CSS perspective for 3D mode
    const windowLayerStyle: React.CSSProperties = is3DMode
        ? {
              perspective: `${windowSpaceSettings.perspective}px`,
              perspectiveOrigin: '50% 50%',
              transformStyle: 'preserve-3d' as const,
          }
        : {};

    return (
        <div
            className="relative h-screen w-screen overflow-hidden select-none"
            onPointerDown={e => {
                if (!isStartMenuOpen) return;
                const target = e.target as HTMLElement;
                if (target.closest('[data-start-menu]')) return;
                if (target.closest('[data-taskbar]')) return;
                closeStartMenu();
            }}
        >
            {/* Wallpaper Layer - WallpaperHost handles both static and live wallpapers */}
            <WallpaperHost fallbackImage={activeWallpaper} />

            {/* Desktop Icons */}
            <div className="absolute inset-0 z-10 w-full h-[calc(100vh-80px)] pointer-events-none">
                {!iconsLoading &&
                    icons.map(iconData => (
                        <div key={iconData.id} className="pointer-events-auto">
                            <DesktopIcon
                                id={iconData.id}
                                icon={iconData.icon}
                                label={iconData.label}
                                colorClass={iconData.colorClass}
                                appId={iconData.appId}
                                position={iconData.position}
                                onPositionChange={handleIconPositionChange}
                            />
                        </div>
                    ))}
            </div>

            {/* Window Manager Layer - applies CSS perspective in 3D mode (F087) */}
            <div className="absolute inset-0 z-10 pointer-events-none" style={windowLayerStyle}>
                {windows.map(window => (
                    <div key={window.id} className="pointer-events-auto">
                        <Window window={window} maxZIndex={maxZIndex} />
                    </div>
                ))}
            </div>

            {/* UI Overlays */}
            <Widgets />
            <StartMenu />
            <Taskbar />
            <PWAUpdatePrompt />
            <ReconnectingToast />
            <NotificationToast />
            <OverviewMode isOpen={isOverviewOpen} onClose={closeOverview} onSelectWindow={handleOverviewSelect} />
            <InstallButton />
            <Screensaver />
        </div>
    );
};

const App: React.FC = () => {
    return (
        <DbProvider>
            <OSProvider>
                <AriaLiveProvider>
                    <Desktop />
                </AriaLiveProvider>
            </OSProvider>
        </DbProvider>
    );
};

export default App;
