import React, { createContext, useContext, useRef, useState, useEffect, ReactNode } from 'react';
import { WindowState, AppConfig } from '../types';
import { WALLPAPERS } from '../utils/constants';
import { getSetting, getWindowStates, WindowStateRecord } from '../utils/fileSystem';
import { storageService } from '../utils/storage';

const KV_KEYS = {
    wallpaper: 'windows15.os.wallpaper',
    openWindows: 'windows15.os.openWindows',
    windowStates: 'windows15.os.windowStates',
} as const;

interface OSContextType {
    windows: WindowState[];
    openWindow: (appId: string, contentProps?: any) => void;
    closeWindow: (id: string) => void;
    minimizeWindow: (id: string) => void;
    toggleMaximizeWindow: (id: string) => void;
    focusWindow: (id: string) => void;
    resizeWindow: (id: string, size: { width: number; height: number }, position?: { x: number; y: number }) => void;
    updateWindowPosition: (id: string, position: { x: number; y: number }) => void;
    registerApp: (config: AppConfig) => void;
    apps: AppConfig[];
    activeWallpaper: string;
    setWallpaper: (url: string) => void;
    isStartMenuOpen: boolean;
    toggleStartMenu: () => void;
    closeStartMenu: () => void;
}

const OSContext = createContext<OSContextType | undefined>(undefined);

export const useOS = () => {
    const context = useContext(OSContext);
    if (!context) throw new Error('useOS must be used within an OSProvider');
    return context;
};

export const OSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [windows, setWindows] = useState<WindowState[]>([]);
    const [apps, setApps] = useState<AppConfig[]>([]);
    const [activeWallpaper, setActiveWallpaper] = useState(WALLPAPERS[0].url);
    const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const nextZIndexRef = useRef(100);
    const savedWindowStatesRef = useRef<WindowStateRecord[]>([]);
    const openAppIdsRef = useRef<string[]>([]);
    const sessionRestoredRef = useRef(false);

    const getNextZIndex = () => nextZIndexRef.current++;

    useEffect(() => {
        const initialize = async () => {
            try {
                const [savedWallpaper, savedStates, savedOpenApps] = await Promise.all([
                    storageService.get<string>(KV_KEYS.wallpaper),
                    storageService.get<WindowStateRecord[]>(KV_KEYS.windowStates),
                    storageService.get<string[]>(KV_KEYS.openWindows),
                ]);

                if (savedWallpaper) {
                    setActiveWallpaper(savedWallpaper);
                } else {
                    const legacyWallpaper = await getSetting<string>('wallpaper');
                    if (legacyWallpaper) {
                        setActiveWallpaper(legacyWallpaper);
                        storageService.set(KV_KEYS.wallpaper, legacyWallpaper).catch(() => undefined);
                    }
                }

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
                } else {
                    const legacyOpenApps = await getSetting<string[]>('openWindows');
                    if (legacyOpenApps && legacyOpenApps.length > 0) {
                        openAppIdsRef.current = legacyOpenApps;
                        storageService.set(KV_KEYS.openWindows, legacyOpenApps).catch(() => undefined);
                    }
                }
            } catch (error) {
                console.error('Failed to initialize from Dexie:', error);
            } finally {
                setIsInitialized(true);
            }
        };
        
        initialize();
    }, []);

    const persistWindowStates = (windowsToSave: WindowState[]) => {
        const states: WindowStateRecord[] = windowsToSave.map(w => ({
            appId: w.appId,
            state: {
                position: w.position,
                size: w.size
            }
        }));
        
        const existingAppIds = new Set(states.map(s => s.appId));
        savedWindowStatesRef.current.forEach(saved => {
            if (!existingAppIds.has(saved.appId)) {
                states.push(saved);
            }
        });
        
        savedWindowStatesRef.current = states;
        storageService.set(KV_KEYS.windowStates, states).catch(() => undefined);

        const openAppIds = windowsToSave.map(w => w.appId);
        storageService.set(KV_KEYS.openWindows, openAppIds).catch(() => undefined);
    };
    
    useEffect(() => {
        if (sessionRestoredRef.current) return;
        if (!isInitialized) return;
        if (apps.length === 0) return;
        if (openAppIdsRef.current.length === 0) return;
        
        sessionRestoredRef.current = true;
        
        const appsToRestore = openAppIdsRef.current.filter(appId => 
            apps.find(a => a.id === appId)
        );
        
        appsToRestore.forEach((appId, index) => {
            setTimeout(() => {
                const app = apps.find(a => a.id === appId);
                if (!app) return;
                
                const savedState = savedWindowStatesRef.current.find(s => s.appId === appId);
                const savedPosition = savedState?.state?.position;
                const savedSize = savedState?.state?.size;
                
                setWindows(prev => {
                    if (prev.find(w => w.appId === appId)) return prev;
                    
                    const nextZIndex = getNextZIndex();
                    const newWindow: WindowState = {
                        id: globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 11),
                        appId: app.id,
                        title: app.title,
                        icon: app.icon,
                        component: <app.component />,
                        isOpen: true,
                        isMinimized: false,
                        isMaximized: false,
                        zIndex: nextZIndex,
                        position: savedPosition || { x: 50 + index * 20, y: 50 + index * 20 },
                        size: savedSize || { width: app.defaultWidth || 800, height: app.defaultHeight || 600 }
                    };
                    return [...prev, newWindow];
                });
            }, index * 50);
        });
    }, [apps, isInitialized]);

    const registerApp = (config: AppConfig) => {
        setApps(prev => {
            if (prev.find(a => a.id === config.id)) return prev;
            return [...prev, config];
        });
    };

    const openWindow = (appId: string, contentProps?: any) => {
        const app = apps.find(a => a.id === appId);
        if (!app) return;

        setWindows(prevWindows => {
            const existing = prevWindows.find(w => w.appId === appId);
            if (existing) {
                const nextZIndex = getNextZIndex();
                return prevWindows.map(w => {
                    if (w.id !== existing.id) return w;
                    return {
                        ...w,
                        isMinimized: false,
                        zIndex: nextZIndex,
                        ...(contentProps !== undefined ? { component: <app.component {...contentProps} /> } : {}),
                    };
                });
            }

            const nextZIndex = getNextZIndex();
            const offset = prevWindows.length * 20;
            
            const savedState = savedWindowStatesRef.current.find(s => s.appId === appId);
            const savedPosition = savedState?.state?.position;
            const savedSize = savedState?.state?.size;
            
            const newWindow: WindowState = {
                id: globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 11),
                appId: app.id,
                title: app.title,
                icon: app.icon,
                component: <app.component {...contentProps} />,
                isOpen: true,
                isMinimized: false,
                isMaximized: false,
                zIndex: nextZIndex,
                position: savedPosition || { x: 50 + offset, y: 50 + offset },
                size: savedSize || { width: app.defaultWidth || 800, height: app.defaultHeight || 600 }
            };

            const newWindows = [...prevWindows, newWindow];
            persistWindowStates(newWindows);
            return newWindows;
        });
        setIsStartMenuOpen(false);
    };

    const closeWindow = (id: string) => {
        setWindows(prev => {
            const windowToClose = prev.find(w => w.id === id);
            if (windowToClose) {
                const existingIndex = savedWindowStatesRef.current.findIndex(
                    s => s.appId === windowToClose.appId
                );
                const newRecord: WindowStateRecord = {
                    appId: windowToClose.appId,
                    state: {
                        position: windowToClose.position,
                        size: windowToClose.size
                    }
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
    };

    const minimizeWindow = (id: string) => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: !w.isMinimized } : w));
    };

    const toggleMaximizeWindow = (id: string) => {
        const nextZIndex = getNextZIndex();
        setWindows(prev => {
            const updated = prev.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized, zIndex: nextZIndex } : w);
            persistWindowStates(updated);
            return updated;
        });
    };

    const focusWindow = (id: string) => {
        const nextZIndex = getNextZIndex();
        setWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: nextZIndex } : w));
    };

    const resizeWindow = (id: string, size: { width: number; height: number }, position?: { x: number; y: number }) => {
        setWindows(prev => {
            const updated = prev.map(w => {
                if (w.id !== id) return w;
                return {
                    ...w,
                    size,
                    ...(position ? { position } : {})
                };
            });
            persistWindowStates(updated);
            return updated;
        });
    };

    const updateWindowPosition = (id: string, position: { x: number; y: number }) => {
        setWindows(prev => {
            const updated = prev.map(w => {
                if (w.id !== id) return w;
                return { ...w, position };
            });
            persistWindowStates(updated);
            return updated;
        });
    };

    const toggleStartMenu = () => setIsStartMenuOpen(prev => !prev);
    const closeStartMenu = () => setIsStartMenuOpen(false);
    
    const setWallpaper = (url: string) => {
        setActiveWallpaper(url);
        storageService.set(KV_KEYS.wallpaper, url).catch(() => undefined);
    };

    return (
        <OSContext.Provider value={{
            windows,
            openWindow,
            closeWindow,
            minimizeWindow,
            toggleMaximizeWindow,
            focusWindow,
            resizeWindow,
            updateWindowPosition,
            registerApp,
            apps,
            activeWallpaper,
            setWallpaper,
            isStartMenuOpen,
            toggleStartMenu,
            closeStartMenu
        }}>
            {children}
        </OSContext.Provider>
    );
};
