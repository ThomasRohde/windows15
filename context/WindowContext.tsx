/**
 * WindowContext - Handles window state management
 */
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { WindowState } from '../types';
import { getWindowStates, WindowStateRecord } from '../utils/fileSystem';
import { storageService } from '../utils/storage';
import { useAppRegistry } from './AppRegistryContext';
import { useStartMenu } from './StartMenuContext';

const KV_KEYS = {
    openWindows: 'windows15.os.openWindows',
    windowStates: 'windows15.os.windowStates',
} as const;

interface WindowContextType {
    windows: WindowState[];
    openWindow: (appId: string, contentProps?: Record<string, unknown>) => void;
    closeWindow: (id: string) => void;
    minimizeWindow: (id: string) => void;
    toggleMaximizeWindow: (id: string) => void;
    focusWindow: (id: string) => void;
    resizeWindow: (id: string, size: { width: number; height: number }, position?: { x: number; y: number }) => void;
    updateWindowPosition: (id: string, position: { x: number; y: number }) => void;
}

const WindowContext = createContext<WindowContextType | undefined>(undefined);

/**
 * Hook to access window management
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
 * Provider for window state management
 */
export const WindowProvider: React.FC<WindowProviderProps> = ({ children }) => {
    const { apps, getApp } = useAppRegistry();
    const { closeStartMenu } = useStartMenu();

    const [windows, setWindows] = useState<WindowState[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    const nextZIndexRef = useRef(100);
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
                return remaining;
            });
        },
        [persistWindowStates]
    );

    const minimizeWindow = useCallback((id: string) => {
        setWindows(prev => prev.map(w => (w.id === id ? { ...w, isMinimized: !w.isMinimized } : w)));
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
            }}
        >
            {children}
        </WindowContext.Provider>
    );
};
