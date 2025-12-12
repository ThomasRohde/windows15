import React, { createContext, useContext, useState, ReactNode } from 'react';
import { WindowState, AppConfig } from '../types';
import { WALLPAPERS } from '../utils/constants';

interface OSContextType {
    windows: WindowState[];
    openWindow: (appId: string, contentProps?: any) => void;
    closeWindow: (id: string) => void;
    minimizeWindow: (id: string) => void;
    toggleMaximizeWindow: (id: string) => void;
    focusWindow: (id: string) => void;
    registerApp: (config: AppConfig) => void;
    apps: AppConfig[];
    activeWallpaper: string;
    setWallpaper: (url: string) => void;
    isStartMenuOpen: boolean;
    toggleStartMenu: () => void;
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
    const [nextZIndex, setNextZIndex] = useState(100);

    const registerApp = (config: AppConfig) => {
        setApps(prev => {
            if (prev.find(a => a.id === config.id)) return prev;
            return [...prev, config];
        });
    };

    const openWindow = (appId: string, contentProps?: any) => {
        const app = apps.find(a => a.id === appId);
        if (!app) return;

        // If app allows single instance and is open, just focus it
        const existing = windows.find(w => w.appId === appId);
        if (existing) {
            focusWindow(existing.id);
            if (existing.isMinimized) minimizeWindow(existing.id); // Toggle back
            return;
        }

        const newWindow: WindowState = {
            id: Math.random().toString(36).substr(2, 9),
            appId: app.id,
            title: app.title,
            icon: app.icon,
            component: <app.component {...contentProps} />,
            isOpen: true,
            isMinimized: false,
            isMaximized: false,
            zIndex: nextZIndex,
            position: { x: 50 + (windows.length * 20), y: 50 + (windows.length * 20) }, // Cascade
            size: { width: app.defaultWidth || 800, height: app.defaultHeight || 600 }
        };

        setWindows([...windows, newWindow]);
        setNextZIndex(prev => prev + 1);
        setIsStartMenuOpen(false);
    };

    const closeWindow = (id: string) => {
        setWindows(prev => prev.filter(w => w.id !== id));
    };

    const minimizeWindow = (id: string) => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: !w.isMinimized } : w));
    };

    const toggleMaximizeWindow = (id: string) => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w));
        focusWindow(id);
    };

    const focusWindow = (id: string) => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: nextZIndex } : w));
        setNextZIndex(prev => prev + 1);
    };

    const toggleStartMenu = () => setIsStartMenuOpen(!isStartMenuOpen);
    const setWallpaper = (url: string) => setActiveWallpaper(url);

    return (
        <OSContext.Provider value={{
            windows,
            openWindow,
            closeWindow,
            minimizeWindow,
            toggleMaximizeWindow,
            focusWindow,
            registerApp,
            apps,
            activeWallpaper,
            setWallpaper,
            isStartMenuOpen,
            toggleStartMenu
        }}>
            {children}
        </OSContext.Provider>
    );
};