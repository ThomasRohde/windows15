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
    LoginScreen,
    ContextMenu,
} from './components';
import { ClipboardHistoryViewer } from './components/ClipboardHistoryViewer';
import {
    OSProvider,
    useOS,
    DbProvider,
    useDb,
    useWindowSpace,
    UserProfileProvider,
    NotificationProvider,
    useClipboard,
} from './context';
import { useDexieLiveQuery } from './utils/storage/react';
import { DesktopIconRecord } from './utils/storage/db';
import { APP_REGISTRY } from './apps';
import { useHotkeys, useContextMenu, useNotification } from './hooks';
import { ensureArray } from './utils';
import { readTextFromClipboard } from './utils/clipboard';
import { analyzeClipboardContent, fetchYoutubeVideoTitle } from './utils/clipboardAnalyzer';
import { getFiles, saveFiles, addFileToFolder } from './utils/fileSystem';
import { processDroppedFiles, hasFiles } from './utils/fileDropHandler';
import { DEFAULT_ICONS } from './utils/defaults';
import { FileSystemItem } from './types';

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
    const { toggleHistory: toggleClipboardHistory } = useClipboard();
    const db = useDb();
    const notify = useNotification();

    // Overview mode state (F095)
    const [isOverviewOpen, setIsOverviewOpen] = useState(false);

    // File drag state for desktop drop handling
    const [isDraggingFile, setIsDraggingFile] = useState(false);

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
    const icons = ensureArray(iconsRaw);

    // Initialize default icons if none exist
    useEffect(() => {
        // Skip if icons already loaded or still loading
        if (iconsLoading || icons.length > 0) return;

        const initializeIcons = async () => {
            await db.transaction('rw', db.desktopIcons, async () => {
                const count = await db.desktopIcons.count();
                console.log('[Desktop Icons] Count:', count, 'Icons loaded:', icons.length);
                if (count === 0) {
                    console.log('[Desktop Icons] Initializing default icons...');
                    // Add each icon individually to let Dexie Cloud generate unique IDs
                    for (const iconData of DEFAULT_ICONS) {
                        // Create a fresh copy with new timestamps
                        const now = Date.now();
                        const newIcon = { ...iconData, createdAt: now, updatedAt: now };
                        await db.desktopIcons.add(newIcon as DesktopIconRecord);
                    }
                    console.log('[Desktop Icons] Default icons added!');
                }
            });
        };
        initializeIcons().catch(err => {
            console.error('[Desktop Icons] Initialization error:', err);
        });
    }, [db, icons.length, iconsLoading]);

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
    }, [registerApp]);

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

    // Desktop background context menu
    const {
        menu: desktopMenu,
        open: openDesktopMenu,
        close: closeDesktopMenu,
        menuProps,
        menuRef,
    } = useContextMenu<void>();

    const handleDesktopContextMenu = useCallback(
        (e: React.MouseEvent) => {
            // Only show if clicking directly on the desktop background, not on icons/windows
            const target = e.target as HTMLElement;
            if (target.closest('[data-desktop-icon]')) return;
            if (target.closest('[data-window]')) return;
            if (target.closest('[data-taskbar]')) return;
            if (target.closest('[data-start-menu]')) return;
            openDesktopMenu(e, undefined);
        },
        [openDesktopMenu]
    );

    const handleRefreshDesktop = useCallback(() => {
        // Trigger a visual refresh notification
        notify.info('Desktop refreshed', { duration: 1500 });
        closeDesktopMenu();
    }, [notify, closeDesktopMenu]);

    const handleResetIcons = useCallback(async () => {
        try {
            await db.transaction('rw', db.desktopIcons, async () => {
                const allIcons = await db.desktopIcons.toArray();
                const now = Date.now();

                // 1. Restore/Reset default icons
                for (const defaultIcon of DEFAULT_ICONS) {
                    // Find all existing instances of this default icon
                    const matches = allIcons.filter(
                        i => i.label === defaultIcon.label && i.appId === defaultIcon.appId
                    );

                    if (matches.length > 1) {
                        // DEDUPLICATION: Delete all except the first one (or oldest)
                        // Sort by createdAt to keep the oldest
                        matches.sort((a, b) => a.createdAt - b.createdAt);
                        const [keep, ...remove] = matches;

                        if (keep) {
                            // Update the one we keep to default position
                            await db.desktopIcons.update(keep.id, {
                                ...defaultIcon,
                                updatedAt: now,
                            });
                        }

                        // Delete the duplicates
                        for (const dup of remove) {
                            if (dup) await db.desktopIcons.delete(dup.id);
                        }
                    } else if (matches.length === 1) {
                        const existing = matches[0];
                        if (existing) {
                            // Reset existing icon to default position
                            await db.desktopIcons.update(existing.id, {
                                ...defaultIcon,
                                updatedAt: now,
                            });
                        }
                    } else {
                        // Create if missing
                        await db.desktopIcons.add({
                            ...defaultIcon,
                            createdAt: now,
                            updatedAt: now,
                        } as DesktopIconRecord);
                    }
                }
            });
            notify.success('Icons reset to default positions');
            closeDesktopMenu();
        } catch (error) {
            console.error('Failed to reset icons:', error);
            notify.error('Failed to reset icons');
        }
    }, [db, notify, closeDesktopMenu]);

    const handleOpenDisplaySettings = useCallback(() => {
        openWindow('settings');
        closeDesktopMenu();
    }, [openWindow, closeDesktopMenu]);

    const handleOpenWallpaperStudio = useCallback(() => {
        openWindow('wallpaperstudio');
        closeDesktopMenu();
    }, [openWindow, closeDesktopMenu]);

    // Desktop paste handler - creates files in desktop folder
    const handleDesktopPaste = useCallback(async () => {
        try {
            const text = await readTextFromClipboard();
            if (!text) {
                notify.warning('Clipboard is empty');
                return;
            }

            const analysis = analyzeClipboardContent(text);
            let newFile: FileSystemItem;

            switch (analysis.type) {
                case 'image-url':
                    newFile = {
                        id: `link-${Date.now()}`,
                        name: analysis.suggestedFileName,
                        type: 'link',
                        url: analysis.content,
                        linkType: 'image',
                        date: new Date().toLocaleDateString(),
                    };
                    break;
                case 'video-url':
                    newFile = {
                        id: `link-${Date.now()}`,
                        name: analysis.suggestedFileName,
                        type: 'link',
                        url: analysis.content,
                        linkType: 'video',
                        date: new Date().toLocaleDateString(),
                    };
                    break;
                case 'audio-url':
                    newFile = {
                        id: `link-${Date.now()}`,
                        name: analysis.suggestedFileName,
                        type: 'link',
                        url: analysis.content,
                        linkType: 'audio',
                        date: new Date().toLocaleDateString(),
                    };
                    break;
                case 'spreadsheet-url':
                    newFile = {
                        id: `link-${Date.now()}`,
                        name: analysis.suggestedFileName,
                        type: 'link',
                        url: analysis.content,
                        linkType: 'web',
                        date: new Date().toLocaleDateString(),
                    };
                    break;
                case 'youtube-url': {
                    // Try to fetch the actual video title from YouTube
                    const videoTitle = await fetchYoutubeVideoTitle(analysis.content);
                    const fileName = videoTitle
                        ? `${videoTitle.substring(0, 50).replace(/[<>:"/\\|?*]/g, '')}.link`
                        : analysis.suggestedFileName;
                    newFile = {
                        id: `link-${Date.now()}`,
                        name: fileName,
                        type: 'link',
                        url: analysis.content,
                        linkType: 'youtube',
                        date: new Date().toLocaleDateString(),
                    };
                    break;
                }
                case 'web-url':
                    newFile = {
                        id: `link-${Date.now()}`,
                        name: analysis.suggestedFileName,
                        type: 'link',
                        url: analysis.content,
                        linkType: 'web',
                        date: new Date().toLocaleDateString(),
                    };
                    break;
                case 'json':
                    newFile = {
                        id: `doc-${Date.now()}`,
                        name: analysis.suggestedFileName,
                        type: 'document',
                        content: analysis.content,
                        date: new Date().toLocaleDateString(),
                    };
                    break;
                case 'plain-text':
                default:
                    newFile = {
                        id: `doc-${Date.now()}`,
                        name: analysis.suggestedFileName,
                        type: 'document',
                        content: analysis.content,
                        date: new Date().toLocaleDateString(),
                    };
                    break;
            }

            // Add file to desktop folder in file system
            const files = await getFiles();
            const updatedFiles = addFileToFolder(files, 'desktop', newFile);
            await saveFiles(updatedFiles);

            // Open the appropriate app for URLs
            if (analysis.type === 'image-url') {
                openWindow('imageviewer', { initialSrc: analysis.content });
            } else if (analysis.type === 'youtube-url') {
                openWindow('youtubeplayer', { initialUrl: analysis.content });
            } else if (['video-url', 'audio-url', 'web-url'].includes(analysis.type)) {
                openWindow('browser', { initialUrl: analysis.content });
            }

            notify.success(`Pasted: ${newFile.name}`);
        } catch (error) {
            console.error('Desktop paste error:', error);
            notify.error('Failed to paste from clipboard');
        }
        closeDesktopMenu();
    }, [notify, openWindow, closeDesktopMenu]);

    // Desktop file drop handler - creates files from dropped files
    const handleDesktopDrop = useCallback(
        async (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingFile(false);

            if (!e.dataTransfer?.files?.length) return;

            try {
                const results = await processDroppedFiles(e.dataTransfer.files);
                const files = await getFiles();
                let updatedFiles = files;

                for (const result of results) {
                    updatedFiles = addFileToFolder(updatedFiles, 'desktop', result.file);
                }

                await saveFiles(updatedFiles);

                // Open the first file with its suggested app
                if (results.length === 1 && results[0]?.suggestedAppId) {
                    const result = results[0];
                    const file = result.file;

                    // Pass appropriate props based on file type
                    if (file.type === 'image' && file.src) {
                        openWindow(result.suggestedAppId, { initialSrc: file.src });
                    } else if (result.suggestedAppId === 'spreadsheet') {
                        openWindow('spreadsheet', {
                            initialContent: file.content,
                            initialFileName: file.name,
                        });
                    } else {
                        openWindow(result.suggestedAppId, {
                            initialContent: file.content,
                            initialFileId: file.id,
                            initialFileName: file.name,
                        });
                    }
                }

                const fileCount = results.length;
                notify.success(`Added ${fileCount} file${fileCount > 1 ? 's' : ''} to desktop`);
            } catch (error) {
                console.error('Desktop drop error:', error);
                notify.error('Failed to add dropped files');
            }
        },
        [notify, openWindow]
    );

    const handleDesktopDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (hasFiles(e.nativeEvent)) {
            setIsDraggingFile(true);
        }
    }, []);

    const handleDesktopDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Only set to false if we're leaving the desktop area entirely
        const relatedTarget = e.relatedTarget as HTMLElement | null;
        if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
            setIsDraggingFile(false);
        }
    }, []);

    const handleDesktopDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (hasFiles(e.nativeEvent)) {
            setIsDraggingFile(true);
        }
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
            notify.info(`Window Space: ${newMode} Mode`, { duration: 2000 });
        },
        // Overview mode (F095)
        'ctrl+tab': () => openOverview(),
        'alt+space': () => openOverview(),
        // Desktop paste (when no window focused)
        'ctrl+v': () => {
            if (!focusedWindow) {
                void handleDesktopPaste();
            }
        },
        // Clipboard history viewer (F164)
        'ctrl+shift+v': () => {
            toggleClipboardHistory();
        },
    });

    // CSS perspective for 3D mode
    // Note: We intentionally do NOT use transformStyle: 'preserve-3d' on the container
    // because it breaks pointer event hit-testing for windows with negative translateZ.
    // The perspective property alone creates the 3D visual effect while allowing
    // normal z-index based hit-testing.
    const windowLayerStyle: React.CSSProperties = is3DMode
        ? {
              perspective: `${windowSpaceSettings.perspective}px`,
              perspectiveOrigin: '50% 50%',
          }
        : {};

    return (
        <div
            className={`relative h-screen w-screen overflow-hidden select-none ${isDraggingFile ? 'ring-4 ring-inset ring-blue-500/50' : ''}`}
            onContextMenu={handleDesktopContextMenu}
            onDrop={handleDesktopDrop}
            onDragOver={handleDesktopDragOver}
            onDragEnter={handleDesktopDragEnter}
            onDragLeave={handleDesktopDragLeave}
            onPointerDown={e => {
                if (!isStartMenuOpen) return;
                const target = e.target as HTMLElement;
                if (target.closest('[data-start-menu]')) return;
                if (target.closest('[data-taskbar]')) return;
                closeStartMenu();
            }}
        >
            {/* File drop overlay indicator */}
            {isDraggingFile && (
                <div className="absolute inset-0 z-[9999] pointer-events-none flex items-center justify-center bg-blue-500/10 backdrop-blur-sm">
                    <div className="glass-card p-8 flex flex-col items-center gap-4">
                        <span className="material-symbols-outlined text-6xl text-blue-400">upload_file</span>
                        <span className="text-white text-lg font-medium">Drop files here</span>
                    </div>
                </div>
            )}

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
            <ClipboardHistoryViewer />

            {/* Desktop Background Context Menu */}
            {desktopMenu && (
                <ContextMenu ref={menuRef} position={desktopMenu.position} onClose={closeDesktopMenu} {...menuProps}>
                    <ContextMenu.Item icon="content_paste" onClick={handleDesktopPaste}>
                        Paste
                    </ContextMenu.Item>
                    <ContextMenu.Item icon="refresh" onClick={handleRefreshDesktop}>
                        Refresh
                    </ContextMenu.Item>
                    <ContextMenu.Item icon="restart_alt" onClick={handleResetIcons}>
                        Reset icons
                    </ContextMenu.Item>
                    <ContextMenu.Separator />
                    <ContextMenu.Submenu icon="sort" label="Sort by">
                        <ContextMenu.Item onClick={closeDesktopMenu}>Name</ContextMenu.Item>
                        <ContextMenu.Item onClick={closeDesktopMenu}>Size</ContextMenu.Item>
                        <ContextMenu.Item onClick={closeDesktopMenu}>Date modified</ContextMenu.Item>
                    </ContextMenu.Submenu>
                    <ContextMenu.Submenu icon="visibility" label="View">
                        <ContextMenu.Item onClick={closeDesktopMenu}>Large icons</ContextMenu.Item>
                        <ContextMenu.Item onClick={closeDesktopMenu}>Medium icons</ContextMenu.Item>
                        <ContextMenu.Item onClick={closeDesktopMenu}>Small icons</ContextMenu.Item>
                    </ContextMenu.Submenu>
                    <ContextMenu.Separator />
                    <ContextMenu.Item icon="wallpaper" onClick={handleOpenWallpaperStudio}>
                        Change wallpaper
                    </ContextMenu.Item>
                    <ContextMenu.Item icon="display_settings" onClick={handleOpenDisplaySettings}>
                        Display settings
                    </ContextMenu.Item>
                </ContextMenu>
            )}
        </div>
    );
};

const App: React.FC = () => {
    return (
        <DbProvider>
            <NotificationProvider>
                <UserProfileProvider>
                    <OSProvider>
                        <AriaLiveProvider>
                            <LoginScreen />
                            <Desktop />
                        </AriaLiveProvider>
                    </OSProvider>
                </UserProfileProvider>
            </NotificationProvider>
        </DbProvider>
    );
};

export default App;
