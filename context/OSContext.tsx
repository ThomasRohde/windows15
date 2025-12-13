import React, { createContext, useContext, useRef, useState, ReactNode } from 'react';
import { WindowState, AppConfig } from '../types';
import { WALLPAPERS } from '../utils/constants';

interface OSContextType {
    windows: WindowState[];
    openWindow: (appId: string, contentProps?: any) => void;
    closeWindow: (id: string) => void;
    minimizeWindow: (id: string) => void;
    toggleMaximizeWindow: (id: string) => void;
    focusWindow: (id: string) => void;
    resizeWindow: (id: string, size: { width: number; height: number }, position?: { x: number; y: number }) => void;
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
    const nextZIndexRef = useRef(100);

    const getNextZIndex = () => nextZIndexRef.current++;

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
                position: { x: 50 + offset, y: 50 + offset },
                size: { width: app.defaultWidth || 800, height: app.defaultHeight || 600 }
            };

            return [...prevWindows, newWindow];
        });
        setIsStartMenuOpen(false);
    };

    const closeWindow = (id: string) => {
        setWindows(prev => prev.filter(w => w.id !== id));
    };

    const minimizeWindow = (id: string) => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: !w.isMinimized } : w));
    };

    const toggleMaximizeWindow = (id: string) => {
        const nextZIndex = getNextZIndex();
        setWindows(prev => prev.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized, zIndex: nextZIndex } : w));
    };

    const focusWindow = (id: string) => {
        const nextZIndex = getNextZIndex();
        setWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: nextZIndex } : w));
    };

    const resizeWindow = (id: string, size: { width: number; height: number }, position?: { x: number; y: number }) => {
        setWindows(prev => prev.map(w => {
            if (w.id !== id) return w;
            return {
                ...w,
                size,
                ...(position ? { position } : {})
            };
        }));
    };

    const toggleStartMenu = () => setIsStartMenuOpen(prev => !prev);
    const closeStartMenu = () => setIsStartMenuOpen(false);
    const setWallpaper = (url: string) => setActiveWallpaper(url);

    return (
        <OSContext.Provider value={{
            windows,
            openWindow,
            closeWindow,
            minimizeWindow,
            toggleMaximizeWindow,
            focusWindow,
            resizeWindow,
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
