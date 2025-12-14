import React, { useEffect } from 'react';
import {
    DesktopIcon,
    Widgets,
    Taskbar,
    Window,
    StartMenu,
    PWAUpdatePrompt,
    ReconnectingToast,
    InstallButton,
} from './components';
import { OSProvider, useOS, DbProvider, useDb } from './context';
import { useDexieLiveQuery } from './utils/storage/react';
import { DesktopIconRecord } from './utils/storage/db';
import { APP_REGISTRY } from './apps';

const Desktop = () => {
    const { windows, registerApp, activeWallpaper, isStartMenuOpen, closeStartMenu } = useOS();
    const db = useDb();

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
                    { label: 'This PC', icon: 'computer', colorClass: 'text-blue-300', appId: 'explorer', position: { x: 20, y: 24 }, order: 0, createdAt: now, updatedAt: now },
                    { label: 'Documents', icon: 'folder_open', colorClass: 'text-yellow-300', appId: 'explorer', position: { x: 20, y: 140 }, order: 1, createdAt: now, updatedAt: now },
                    { label: 'Browser', icon: 'public', colorClass: 'text-green-300', appId: 'browser', position: { x: 20, y: 256 }, order: 2, createdAt: now, updatedAt: now },
                    { label: 'Terminal', icon: 'terminal', colorClass: 'text-green-400', appId: 'terminal', position: { x: 20, y: 372 }, order: 3, createdAt: now, updatedAt: now },
                    { label: 'Timer', icon: 'timer', colorClass: 'text-red-300', appId: 'timer', position: { x: 140, y: 24 }, order: 4, createdAt: now, updatedAt: now },
                    { label: 'JSON Viewer', icon: 'data_object', colorClass: 'text-amber-300', appId: 'jsonviewer', position: { x: 140, y: 140 }, order: 5, createdAt: now, updatedAt: now },
                    { label: 'Todo List', icon: 'checklist', colorClass: 'text-lime-300', appId: 'todolist', position: { x: 140, y: 256 }, order: 6, createdAt: now, updatedAt: now },
                    { label: 'Recycle Bin', icon: 'delete', colorClass: 'text-gray-300', appId: 'recyclebin', position: { x: 140, y: 372 }, order: 7, createdAt: now, updatedAt: now },
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

    // Handle icon position changes
    const handleIconPositionChange = async (id: string, position: { x: number; y: number }) => {
        await db.desktopIcons.update(id, { position, updatedAt: Date.now() });
    };

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

    return (
        <div
            className="relative h-screen w-screen overflow-hidden select-none"
            onPointerDown={(e) => {
                if (!isStartMenuOpen) return;
                const target = e.target as HTMLElement;
                if (target.closest('[data-start-menu]')) return;
                if (target.closest('[data-taskbar]')) return;
                closeStartMenu();
            }}
        >
            {/* Wallpaper */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-700 ease-in-out transform scale-105"
                style={{ backgroundImage: `url('${activeWallpaper}')` }}
            >
                <div className="absolute inset-0 bg-black/10 backdrop-blur-[0px]"></div>
            </div>

            {/* Desktop Icons */}
            <div className="absolute inset-0 z-10 w-full h-[calc(100vh-80px)] pointer-events-none">
                {!iconsLoading && icons.map(iconData => (
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

            {/* Window Manager Layer */}
            <div className="absolute inset-0 z-10 pointer-events-none">
                {windows.map(window => (
                    <div key={window.id} className="pointer-events-auto">
                        <Window window={window} />
                    </div>
                ))}
            </div>

            {/* UI Overlays */}
            <Widgets />
            <StartMenu />
            <Taskbar />
            <PWAUpdatePrompt />
            <ReconnectingToast />
            <InstallButton />
        </div>
    );
};

const App: React.FC = () => {
    return (
        <DbProvider>
            <OSProvider>
                <Desktop />
            </OSProvider>
        </DbProvider>
    );
};

export default App;
