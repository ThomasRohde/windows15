/**
 * WallpaperContext - Handles wallpaper/theme management
 */
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { WALLPAPERS } from '../utils/constants';
import { getSetting } from '../utils/fileSystem';
import { storageService } from '../utils/storage';
import type { WallpaperManifest, WallpaperSettings } from '../types/wallpaper';
import { DEFAULT_WALLPAPER_SETTINGS } from '../types/wallpaper';

const KV_KEY_WALLPAPER = 'windows15.os.wallpaper';
const KV_KEY_WALLPAPER_MANIFEST = 'windows15.os.wallpaperManifest';
const KV_KEY_WALLPAPER_SETTINGS = 'wallpaperSettings';

const normalizeWallpaperSettings = (value: unknown): WallpaperSettings => {
    const base = DEFAULT_WALLPAPER_SETTINGS;
    if (!value || typeof value !== 'object') return base;
    const partial = value as Partial<WallpaperSettings>;

    const intensity =
        typeof partial.intensity === 'number' && Number.isFinite(partial.intensity)
            ? Math.max(0, Math.min(1, partial.intensity))
            : base.intensity;

    const fpsCap =
        partial.fpsCap === 15 || partial.fpsCap === 30 || partial.fpsCap === 60 ? partial.fpsCap : base.fpsCap;

    const quality =
        partial.quality === 'low' || partial.quality === 'med' || partial.quality === 'high'
            ? partial.quality
            : base.quality;

    const audioReactive = typeof partial.audioReactive === 'boolean' ? partial.audioReactive : base.audioReactive;

    const micSensitivity =
        typeof partial.micSensitivity === 'number' && Number.isFinite(partial.micSensitivity)
            ? Math.max(0, Math.min(1, partial.micSensitivity))
            : base.micSensitivity;

    return { intensity, fpsCap, quality, audioReactive, micSensitivity };
};

interface WallpaperContextType {
    activeWallpaper: string;
    activeManifest: WallpaperManifest | null;
    setWallpaper: (urlOrManifest: string | WallpaperManifest) => Promise<void>;
    wallpapers: typeof WALLPAPERS;
    settings: WallpaperSettings;
    updateSettings: (update: Partial<WallpaperSettings>) => void;
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
    const [settings, setSettingsState] = useState<WallpaperSettings>(DEFAULT_WALLPAPER_SETTINGS);

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

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const saved = await storageService.get<unknown>(KV_KEY_WALLPAPER_SETTINGS);
                setSettingsState(normalizeWallpaperSettings(saved));
            } catch (error) {
                console.error('Failed to load wallpaper settings:', error);
            }
        };

        void loadSettings();

        const unsubscribe = storageService.subscribe<unknown>(KV_KEY_WALLPAPER_SETTINGS, value => {
            setSettingsState(normalizeWallpaperSettings(value));
        });

        return unsubscribe;
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

    const updateSettings = useCallback((update: Partial<WallpaperSettings>) => {
        setSettingsState(prev => {
            const next = normalizeWallpaperSettings({ ...prev, ...update });
            storageService.set(KV_KEY_WALLPAPER_SETTINGS, next).catch(() => undefined);
            return next;
        });
    }, []);

    return (
        <WallpaperContext.Provider
            value={{ activeWallpaper, activeManifest, setWallpaper, wallpapers: WALLPAPERS, settings, updateSettings }}
        >
            {children}
        </WallpaperContext.Provider>
    );
};
