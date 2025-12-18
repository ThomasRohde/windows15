/**
 * WindowContext - Window state management and lifecycle
 *
 * Provides window creation, destruction, focus, minimize, maximize,
 * resize, and position management for the desktop environment.
 *
 * @module context/WindowContext
 */
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { WindowState } from '../types';
import { getWindowStates, WindowStateRecord } from '../utils/fileSystem';
import { storageService } from '../utils/storage';
import { soundService } from '../utils/soundService';
import { useAppRegistry } from './AppRegistryContext';
import { useStartMenu } from './StartMenuContext';
import { Z_INDEX } from '../utils/constants';

const KV_KEYS = {
    openWindows: 'windows15.os.openWindows',
    windowStates: 'windows15.os.windowStates',
} as const;

/**
 * Window management context interface
 */
interface WindowContextType {
    /** Currently open windows */
    windows: WindowState[];
    /**
     * Open a new window for an application
     * @param appId - The registered application ID
     * @param contentProps - Optional props to pass to the app component
     */
    openWindow: (appId: string, contentProps?: Record<string, unknown>) => void;
    /**
     * Close a window by ID
     * @param id - The window instance ID
     */
    closeWindow: (id: string) => void;
    /**
     * Minimize a window to the taskbar
     * @param id - The window instance ID
     */
    minimizeWindow: (id: string) => void;
    /**
     * Toggle between maximized and normal window state
     * @param id - The window instance ID
     */
    toggleMaximizeWindow: (id: string) => void;
    /**
     * Bring a window to the front
     * @param id - The window instance ID
     */
    focusWindow: (id: string) => void;
    /**
     * Resize a window and optionally update its position
     * @param id - The window instance ID
     * @param size - New dimensions
     * @param position - Optional new position
     */
    resizeWindow: (id: string, size: { width: number; height: number }, position?: { x: number; y: number }) => void;
    /**
     * Update window position
     * @param id - The window instance ID
     * @param position - New position coordinates
     */
    updateWindowPosition: (id: string, position: { x: number; y: number }) => void;
    /**
     * Set dynamic title for a window (F148)
     * @param id - The window instance ID
     * @param title - New title or null to revert to default
     */
    setWindowTitle: (id: string, title: string | null) => void;
    /**
     * Set dynamic icon for a window (F148)
     * @param id - The window instance ID
     * @param icon - New icon name or null to revert to default
     */
    setWindowIcon: (id: string, icon: string | null) => void;
    /**
     * Set badge count for a window (F148)
     * @param id - The window instance ID
     * @param count - Badge count or null to clear
     */
    setWindowBadge: (id: string, count: number | null) => void;
}

const WindowContext = createContext<WindowContextType | undefined>(undefined);

/**
 * Hook to access window management functions
 *
 * @returns Window management context
 * @throws Error if used outside WindowProvider
 *
 * @example
 * ```tsx
 * const { openWindow, closeWindow, windows } = useWindowManager();
 *
 * // Open an app
 * openWindow('notepad');
 *
 * // Close a window
 * closeWindow(windowId);
 * ```
 */
export const useWindowManager = () => {
    const context = useContext(WindowContext);
    if (!context) {
        throw new Error('useWindowManager must be used within a WindowProvider');
    }
    return context;
};

interface WindowProviderProps {
    children: ReactNode;
}

/**
 * Provider component for window state management.
 * Handles window lifecycle, persistence, and session restoration.
 */
export const WindowProvider: React.FC<WindowProviderProps> = ({ children }) => {
    const { apps, getApp } = useAppRegistry();
    const { closeStartMenu } = useStartMenu();

    const [windows, setWindows] = useState<WindowState[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    const nextZIndexRef = useRef(Z_INDEX.WINDOW_BASE);
    const savedWindowStatesRef = useRef<WindowStateRecord[]>([]);
    const openAppIdsRef = useRef<string[]>([]);
    const sessionRestoredRef = useRef(false);

    const getNextZIndex = () => nextZIndexRef.current++;

    // Initialize from storage
    useEffect(() => {
        const initialize = async () => {
            try {
                const [savedStates, savedOpenApps] = await Promise.all([
                    storageService.get<WindowStateRecord[]>(KV_KEYS.windowStates),
                    storageService.get<string[]>(KV_KEYS.openWindows),
                ]);

                if (Array.isArray(savedStates)) {
                    savedWindowStatesRef.current = savedStates;
                } else {
                    const legacyStates = await getWindowStates();
                    if (legacyStates.length > 0) {
                        savedWindowStatesRef.current = legacyStates;
                        storageService.set(KV_KEYS.windowStates, legacyStates).catch(() => undefined);
                    }
                }

                if (Array.isArray(savedOpenApps) && savedOpenApps.length > 0) {
                    openAppIdsRef.current = savedOpenApps;
                }
            } catch (error) {
                console.error('Failed to initialize window states:', error);
            } finally {
                setIsInitialized(true);
            }
        };
        initialize();
    }, []);

    const persistWindowStates = useCallback((windowsToSave: WindowState[]) => {
        const states: WindowStateRecord[] = windowsToSave.map(w => ({
            appId: w.appId,
            state: { position: w.position, size: w.size },
        }));

        const existingAppIds = new Set(states.map(s => s.appId));
        savedWindowStatesRef.current.forEach(saved => {
            if (!existingAppIds.has(saved.appId)) {
                states.push(saved);
            }
        });

        savedWindowStatesRef.current = states;
        storageService.set(KV_KEYS.windowStates, states).catch(() => undefined);
        storageService
            .set(
                KV_KEYS.openWindows,
                windowsToSave.map(w => w.appId)
            )
            .catch(() => undefined);
    }, []);

    // Restore session
    useEffect(() => {
        if (sessionRestoredRef.current || !isInitialized || apps.length === 0 || openAppIdsRef.current.length === 0)
            return;
        sessionRestoredRef.current = true;

        const appsToRestore = openAppIdsRef.current.filter(appId => apps.find(a => a.id === appId));

        appsToRestore.forEach((appId, index) => {
            setTimeout(() => {
                const app = apps.find(a => a.id === appId);
                if (!app) return;

                const savedState = savedWindowStatesRef.current.find(s => s.appId === appId);

                setWindows(prev => {
                    if (prev.find(w => w.appId === appId)) return prev;

                    const newWindow: WindowState = {
                        id: globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 11),
                        appId: app.id,
                        title: app.title,
                        icon: app.icon,
                        component: <app.component />,
                        isOpen: true,
                        isMinimized: false,
                        isMaximized: false,
                        zIndex: getNextZIndex(),
                        position: savedState?.state?.position ?? { x: 50 + index * 20, y: 50 + index * 20 },
                        size: savedState?.state?.size ?? {
                            width: app.defaultWidth ?? 800,
                            height: app.defaultHeight ?? 600,
                        },
                    };
                    return [...prev, newWindow];
                });
            }, index * 50);
        });
    }, [apps, isInitialized]);

    const openWindow = useCallback(
        (appId: string, contentProps?: Record<string, unknown>) => {
            const app = getApp(appId);
            if (!app) return;

            setWindows(prevWindows => {
                const existing = prevWindows.find(w => w.appId === appId);
                if (existing) {
                    return prevWindows.map(w => {
                        if (w.id !== existing.id) return w;
                        return {
                            ...w,
                            isMinimized: false,
                            zIndex: getNextZIndex(),
                            ...(contentProps ? { component: <app.component {...contentProps} /> } : {}),
                        };
                    });
                }

                const offset = prevWindows.length * 20;
                const savedState = savedWindowStatesRef.current.find(s => s.appId === appId);

                const newWindow: WindowState = {
                    id: globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 11),
                    appId: app.id,
                    title: app.title,
                    icon: app.icon,
                    component: <app.component {...contentProps} />,
                    isOpen: true,
                    isMinimized: false,
                    isMaximized: false,
                    zIndex: getNextZIndex(),
                    position: savedState?.state?.position ?? { x: 50 + offset, y: 50 + offset },
                    size: savedState?.state?.size ?? {
                        width: app.defaultWidth ?? 800,
                        height: app.defaultHeight ?? 600,
                    },
                };

                const newWindows = [...prevWindows, newWindow];
                persistWindowStates(newWindows);
                soundService.play('open');
                return newWindows;
            });
            closeStartMenu();
        },
        [getApp, persistWindowStates, closeStartMenu]
    );

    const closeWindow = useCallback(
        (id: string) => {
            setWindows(prev => {
                const windowToClose = prev.find(w => w.id === id);
                if (windowToClose) {
                    const existingIndex = savedWindowStatesRef.current.findIndex(s => s.appId === windowToClose.appId);
                    const newRecord: WindowStateRecord = {
                        appId: windowToClose.appId,
                        state: { position: windowToClose.position, size: windowToClose.size },
                    };

                    if (existingIndex >= 0) {
                        savedWindowStatesRef.current[existingIndex] = newRecord;
                    } else {
                        savedWindowStatesRef.current.push(newRecord);
                    }
                    storageService.set(KV_KEYS.windowStates, savedWindowStatesRef.current).catch(() => undefined);
                }
                const remaining = prev.filter(w => w.id !== id);
                persistWindowStates(remaining);
                soundService.play('close');
                return remaining;
            });
        },
        [persistWindowStates]
    );

    const minimizeWindow = useCallback((id: string) => {
        setWindows(prev => prev.map(w => (w.id === id ? { ...w, isMinimized: !w.isMinimized } : w)));
        soundService.play('minimize');
    }, []);

    const toggleMaximizeWindow = useCallback(
        (id: string) => {
            setWindows(prev => {
                const updated = prev.map(w =>
                    w.id === id ? { ...w, isMaximized: !w.isMaximized, zIndex: getNextZIndex() } : w
                );
                persistWindowStates(updated);
                return updated;
            });
        },
        [persistWindowStates]
    );

    const focusWindow = useCallback((id: string) => {
        setWindows(prev => prev.map(w => (w.id === id ? { ...w, zIndex: getNextZIndex() } : w)));
    }, []);

    const resizeWindow = useCallback(
        (id: string, size: { width: number; height: number }, position?: { x: number; y: number }) => {
            setWindows(prev => {
                const updated = prev.map(w => (w.id !== id ? w : { ...w, size, ...(position ? { position } : {}) }));
                persistWindowStates(updated);
                return updated;
            });
        },
        [persistWindowStates]
    );

    const updateWindowPosition = useCallback(
        (id: string, position: { x: number; y: number }) => {
            setWindows(prev => {
                const updated = prev.map(w => (w.id !== id ? w : { ...w, position }));
                persistWindowStates(updated);
                return updated;
            });
        },
        [persistWindowStates]
    );

    const setWindowTitle = useCallback((id: string, title: string | null) => {
        setWindows(prev => prev.map(w => (w.id === id ? { ...w, dynamicTitle: title } : w)));
    }, []);

    const setWindowIcon = useCallback((id: string, icon: string | null) => {
        setWindows(prev => prev.map(w => (w.id === id ? { ...w, dynamicIcon: icon } : w)));
    }, []);

    const setWindowBadge = useCallback((id: string, count: number | null) => {
        // Validate count: must be null, 0, or positive integer
        const validCount = count === null || count <= 0 ? null : Math.floor(count);
        setWindows(prev => prev.map(w => (w.id === id ? { ...w, badge: validCount } : w)));
    }, []);

    return (
        <WindowContext.Provider
            value={{
                windows,
                openWindow,
                closeWindow,
                minimizeWindow,
                toggleMaximizeWindow,
                focusWindow,
                resizeWindow,
                updateWindowPosition,
                setWindowTitle,
                setWindowIcon,
                setWindowBadge,
            }}
        >
            {children}
        </WindowContext.Provider>
    );
};
