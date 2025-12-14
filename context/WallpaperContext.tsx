/**
 * WallpaperContext - Handles wallpaper/theme management
 */
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { WALLPAPERS } from '../utils/constants';
import { getSetting } from '../utils/fileSystem';
import { storageService } from '../utils/storage';

const KV_KEY_WALLPAPER = 'windows15.os.wallpaper';

interface WallpaperContextType {
    activeWallpaper: string;
    setWallpaper: (url: string) => void;
    wallpapers: typeof WALLPAPERS;
}

const WallpaperContext = createContext<WallpaperContextType | undefined>(undefined);

/**
 * Hook to access wallpaper state
 */
export const useWallpaper = () => {
    const context = useContext(WallpaperContext);
    if (!context) {
        throw new Error('useWallpaper must be used within a WallpaperProvider');
    }
    return context;
};

interface WallpaperProviderProps {
    children: ReactNode;
}

/**
 * Provider for wallpaper management
 */
export const WallpaperProvider: React.FC<WallpaperProviderProps> = ({ children }) => {
    const [activeWallpaper, setActiveWallpaperState] = useState(WALLPAPERS[0]?.url ?? '');

    useEffect(() => {
        const loadWallpaper = async () => {
            try {
                const savedWallpaper = await storageService.get<string>(KV_KEY_WALLPAPER);
                if (savedWallpaper) {
                    setActiveWallpaperState(savedWallpaper);
                } else {
                    const legacyWallpaper = await getSetting<string>('wallpaper');
                    if (legacyWallpaper) {
                        setActiveWallpaperState(legacyWallpaper);
                        storageService.set(KV_KEY_WALLPAPER, legacyWallpaper).catch(() => undefined);
                    }
                }
            } catch (error) {
                console.error('Failed to load wallpaper:', error);
            }
        };
        loadWallpaper();
    }, []);

    const setWallpaper = useCallback((url: string) => {
        setActiveWallpaperState(url);
        storageService.set(KV_KEY_WALLPAPER, url).catch(() => undefined);
    }, []);

    return (
        <WallpaperContext.Provider value={{ activeWallpaper, setWallpaper, wallpapers: WALLPAPERS }}>
            {children}
        </WallpaperContext.Provider>
    );
};
