/**
 * WallpaperHost Component (F085)
 *
 * Renders live wallpaper behind desktop icons and windows.
 * Manages wallpaper lifecycle, Page Visibility API, and canvas resizing.
 */
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useDb } from '../context/DbContext';
import type { WallpaperRuntime, WallpaperSettings, WallpaperManifest } from '../types/wallpaper';
import { DEFAULT_WALLPAPER_SETTINGS } from '../types/wallpaper';

interface WallpaperHostProps {
    /** Fallback image URL when no live wallpaper is active */
    fallbackImage?: string;
}

/**
 * WallpaperHost - Renders live wallpaper behind the desktop
 *
 * Features:
 * - Mounts as render layer behind icons and windows (z-index: 0)
 * - Resizes canvas correctly on viewport change
 * - Persists wallpaper selection via Dexie kv table
 * - Disposes prior runtime on wallpaper switch
 * - Pauses animation when tab not visible (Page Visibility API)
 */
export const WallpaperHost: React.FC<WallpaperHostProps> = ({ fallbackImage }) => {
    const db = useDb();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const runtimeRef = useRef<WallpaperRuntime | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number>(0);

    const [activeWallpaper, setActiveWallpaper] = useState<WallpaperManifest | null>(null);
    const [settings, setSettings] = useState<WallpaperSettings>(DEFAULT_WALLPAPER_SETTINGS);
    const [isVisible, setIsVisible] = useState(!document.hidden);
    const [isLiveWallpaperActive, setIsLiveWallpaperActive] = useState(false);

    // Load active wallpaper from settings on mount
    useEffect(() => {
        const loadWallpaperPreference = async () => {
            if (!db) return;

            try {
                const wallpaperRecord = await db.kv.get('activeWallpaper');
                if (wallpaperRecord) {
                    const manifest = JSON.parse(wallpaperRecord.valueJson) as WallpaperManifest;
                    setActiveWallpaper(manifest);
                    setIsLiveWallpaperActive(manifest.type !== 'image');
                }

                const settingsRecord = await db.kv.get('wallpaperSettings');
                if (settingsRecord) {
                    const savedSettings = JSON.parse(settingsRecord.valueJson) as WallpaperSettings;
                    setSettings({ ...DEFAULT_WALLPAPER_SETTINGS, ...savedSettings });
                }
            } catch (error) {
                console.error('[WallpaperHost] Failed to load preferences:', error);
            }
        };

        void loadWallpaperPreference();
    }, [db]);

    // Page Visibility API - pause when tab hidden
    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsVisible(!document.hidden);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Handle canvas resize on viewport change
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleResize = () => {
            const dpr = window.devicePixelRatio || 1;
            const width = window.innerWidth;
            const height = window.innerHeight;

            // Update canvas dimensions
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            // Notify runtime of resize
            if (runtimeRef.current) {
                runtimeRef.current.resize(width, height, dpr);
            }
        };

        // Initial sizing
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Frame rate limited render loop
    const renderLoop = useCallback(
        (timestamp: number) => {
            if (!isVisible || !runtimeRef.current) {
                animationFrameRef.current = requestAnimationFrame(renderLoop);
                return;
            }

            const frameInterval = 1000 / settings.fpsCap;
            const elapsed = timestamp - lastFrameTimeRef.current;

            if (elapsed >= frameInterval) {
                lastFrameTimeRef.current = timestamp - (elapsed % frameInterval);
                runtimeRef.current.render(timestamp);
            }

            animationFrameRef.current = requestAnimationFrame(renderLoop);
        },
        [isVisible, settings.fpsCap]
    );

    // Start/stop render loop based on visibility and active wallpaper
    useEffect(() => {
        if (isLiveWallpaperActive && isVisible && runtimeRef.current) {
            animationFrameRef.current = requestAnimationFrame(renderLoop);
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [isLiveWallpaperActive, isVisible, renderLoop]);

    // Clean up runtime on unmount or wallpaper change
    useEffect(() => {
        return () => {
            if (runtimeRef.current) {
                runtimeRef.current.dispose();
                runtimeRef.current = null;
            }
        };
    }, [activeWallpaper]);

    // Update runtime settings when changed
    useEffect(() => {
        if (runtimeRef.current) {
            runtimeRef.current.setSettings(settings);
        }
    }, [settings]);

    // Render static image fallback or canvas for live wallpaper
    if (!isLiveWallpaperActive) {
        // Static image wallpaper (existing behavior)
        return (
            <div
                className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-700 ease-in-out transform scale-105"
                style={{ backgroundImage: `url('${fallbackImage || ''}')` }}
            >
                <div className="absolute inset-0 bg-black/10 backdrop-blur-[0px]" />
            </div>
        );
    }

    // Live wallpaper canvas
    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 z-0"
            style={{
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
            }}
            aria-hidden="true"
        />
    );
};

export default WallpaperHost;
