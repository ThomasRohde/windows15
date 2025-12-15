/**
 * WallpaperContext - Handles wallpaper/theme management
 */
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { WALLPAPERS } from '../utils/constants';
import { getSetting } from '../utils/fileSystem';
import { storageService } from '../utils/storage';
import type { WallpaperManifest } from '../types/wallpaper';

const KV_KEY_WALLPAPER = 'windows15.os.wallpaper';
const KV_KEY_WALLPAPER_MANIFEST = 'windows15.os.wallpaperManifest';

interface WallpaperContextType {
    activeWallpaper: string;
    activeManifest: WallpaperManifest | null;
    setWallpaper: (urlOrManifest: string | WallpaperManifest) => Promise<void>;
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
    const [activeManifest, setActiveManifest] = useState<WallpaperManifest | null>(null);

    useEffect(() => {
        const loadWallpaper = async () => {
            try {
                // Try to load manifest first (for shader wallpapers)
                const savedManifest = await storageService.get<WallpaperManifest>(KV_KEY_WALLPAPER_MANIFEST);
                if (savedManifest) {
                    setActiveManifest(savedManifest);
                    if (savedManifest.preview) {
                        setActiveWallpaperState(savedManifest.preview);
                    }
                    return;
                }

                // Fall back to URL-based wallpaper (legacy/image wallpapers)
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

    const setWallpaper = useCallback(async (urlOrManifest: string | WallpaperManifest) => {
        if (typeof urlOrManifest === 'string') {
            // Image wallpaper - just a URL
            setActiveWallpaperState(urlOrManifest);
            setActiveManifest(null);
            await storageService.set(KV_KEY_WALLPAPER, urlOrManifest);
            await storageService.remove(KV_KEY_WALLPAPER_MANIFEST);
        } else {
            // Shader/scene wallpaper - full manifest
            setActiveManifest(urlOrManifest);
            if (urlOrManifest.preview) {
                setActiveWallpaperState(urlOrManifest.preview);
            }
            await storageService.set(KV_KEY_WALLPAPER_MANIFEST, urlOrManifest);
            await storageService.set(KV_KEY_WALLPAPER, urlOrManifest.preview || '');
        }
    }, []);

    return (
        <WallpaperContext.Provider value={{ activeWallpaper, activeManifest, setWallpaper, wallpapers: WALLPAPERS }}>
            {children}
        </WallpaperContext.Provider>
    );
};
