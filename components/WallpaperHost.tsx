/**
 * WallpaperHost Component (F085, F089, F090, F092)
 *
 * Renders live wallpaper behind desktop icons and windows.
 * Manages wallpaper lifecycle and canvas resizing.
 * Uses WallpaperScheduler (F086) for render loop management.
 * Integrates WebGPU (F089) and WebGL2 fallback (F090) runtimes.
 * Supports audio-reactive mode with microphone input (F092).
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useDb } from '../context/DbContext';
import type { WallpaperRuntime, WallpaperSettings, WallpaperManifest } from '../types/wallpaper';
import { DEFAULT_WALLPAPER_SETTINGS } from '../types/wallpaper';
import { WallpaperScheduler } from '../utils/WallpaperScheduler';
import { createShaderRuntime, getPreferredRuntime, type RuntimeType } from '../runtime';
import { AudioAnalyzer, type AnalyzerState } from '../utils/audio';

interface WallpaperHostProps {
    /** Fallback image URL when no live wallpaper is active */
    fallbackImage?: string;
    /** Enable battery saver mode */
    batterySaver?: boolean;
}

/**
 * WallpaperHost - Renders live wallpaper behind the desktop
 *
 * Features:
 * - Mounts as render layer behind icons and windows (z-index: 0)
 * - Resizes canvas correctly on viewport change
 * - Persists wallpaper selection via Dexie kv table
 * - Disposes prior runtime on wallpaper switch
 * - Uses WallpaperScheduler for FPS-capped render loop
 * - Battery saver mode auto-reduces FPS and resolution
 * - Auto-selects WebGPU or WebGL2 runtime based on browser support
 * - Audio-reactive mode with microphone input analysis
 */
export const WallpaperHost: React.FC<WallpaperHostProps> = ({ fallbackImage, batterySaver = false }) => {
    const db = useDb();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const runtimeRef = useRef<WallpaperRuntime | null>(null);
    const schedulerRef = useRef<WallpaperScheduler | null>(null);
    const audioAnalyzerRef = useRef<AudioAnalyzer | null>(null);

    const [activeWallpaper, setActiveWallpaper] = useState<WallpaperManifest | null>(null);
    const [settings, setSettings] = useState<WallpaperSettings>(DEFAULT_WALLPAPER_SETTINGS);
    const [isLiveWallpaperActive, setIsLiveWallpaperActive] = useState(false);
    const [runtimeType, setRuntimeType] = useState<RuntimeType>('none');
    const [runtimeError, setRuntimeError] = useState<string | null>(null);
    const [audioState, setAudioState] = useState<AnalyzerState>('inactive');

    // Detect available runtime on mount
    useEffect(() => {
        setRuntimeType(getPreferredRuntime());
    }, []);

    // Handle audio reactive mode (F092)
    useEffect(() => {
        const setupAudioAnalyzer = async () => {
            if (settings.audioReactive && isLiveWallpaperActive) {
                // Create and start audio analyzer
                if (!audioAnalyzerRef.current) {
                    audioAnalyzerRef.current = new AudioAnalyzer({
                        sensitivity: settings.micSensitivity,
                    });
                    audioAnalyzerRef.current.setOnStateChange(setAudioState);
                }

                await audioAnalyzerRef.current.start();
            } else {
                // Stop and dispose audio analyzer
                if (audioAnalyzerRef.current) {
                    audioAnalyzerRef.current.stop();
                }
            }
        };

        void setupAudioAnalyzer();

        return () => {
            if (audioAnalyzerRef.current) {
                audioAnalyzerRef.current.dispose();
                audioAnalyzerRef.current = null;
            }
        };
    }, [settings.audioReactive, settings.micSensitivity, isLiveWallpaperActive]);

    // Update audio analyzer sensitivity when setting changes
    useEffect(() => {
        if (audioAnalyzerRef.current) {
            audioAnalyzerRef.current.setConfig({ sensitivity: settings.micSensitivity });
        }
    }, [settings.micSensitivity]);

    // Initialize shader runtime when wallpaper changes
    const initializeRuntime = useCallback(async () => {
        if (!canvasRef.current || !activeWallpaper || activeWallpaper.type !== 'shader') {
            return;
        }

        // Dispose previous runtime
        if (runtimeRef.current) {
            runtimeRef.current.dispose();
            runtimeRef.current = null;
        }

        try {
            setRuntimeError(null);

            // Create runtime with optional shader URLs from manifest
            const runtime = await createShaderRuntime({
                wgslUrl: activeWallpaper.entry,
                glslUrl: activeWallpaper.fallback,
            });

            if (!runtime) {
                throw new Error('No compatible shader runtime available');
            }

            // Initialize with canvas and settings
            await runtime.init({
                canvas: canvasRef.current,
                settings,
            });

            runtimeRef.current = runtime;
            console.log(`[WallpaperHost] Shader runtime initialized (${runtimeType})`);
        } catch (error) {
            console.error('[WallpaperHost] Failed to initialize shader runtime:', error);
            setRuntimeError(error instanceof Error ? error.message : 'Unknown error');
            setIsLiveWallpaperActive(false);
        }
    }, [activeWallpaper, settings, runtimeType]);

    // Initialize runtime when shader wallpaper is selected
    useEffect(() => {
        if (isLiveWallpaperActive && activeWallpaper?.type === 'shader') {
            void initializeRuntime();
        }
    }, [isLiveWallpaperActive, activeWallpaper, initializeRuntime]);

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

    // Initialize scheduler
    useEffect(() => {
        schedulerRef.current = new WallpaperScheduler({
            fpsCap: settings.fpsCap,
            batterySaver,
            quality: settings.quality,
        });

        return () => {
            if (schedulerRef.current) {
                schedulerRef.current.dispose();
                schedulerRef.current = null;
            }
        };
    }, []);

    // Update scheduler config when settings change
    useEffect(() => {
        if (schedulerRef.current) {
            schedulerRef.current.updateFromSettings(settings);
            schedulerRef.current.updateConfig({ batterySaver });
        }
    }, [settings, batterySaver]);

    // Handle canvas resize on viewport change
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleResize = () => {
            const dpr = window.devicePixelRatio || 1;
            const scale = schedulerRef.current?.resolutionScale ?? 1;
            const width = window.innerWidth;
            const height = window.innerHeight;

            // Update canvas dimensions (with resolution scaling for battery saver)
            canvas.width = Math.floor(width * dpr * scale);
            canvas.height = Math.floor(height * dpr * scale);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            // Notify runtime of resize
            if (runtimeRef.current) {
                runtimeRef.current.resize(width, height, dpr * scale);
            }
        };

        // Initial sizing
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Start/stop render loop via scheduler
    useEffect(() => {
        const scheduler = schedulerRef.current;
        const runtime = runtimeRef.current;

        if (isLiveWallpaperActive && runtime && scheduler) {
            // Start scheduler with render callback that includes audio data
            scheduler.start((timestamp: number) => {
                // Pass audio data to runtime if available
                if (audioAnalyzerRef.current && audioState === 'active' && 'setAudioData' in runtime) {
                    const runtimeWithAudio = runtime as WallpaperRuntime & {
                        setAudioData: (frequencies: Float32Array, level: number) => void;
                    };
                    runtimeWithAudio.setAudioData(
                        audioAnalyzerRef.current.getBandsAsArray(),
                        audioAnalyzerRef.current.getLevel()
                    );
                }
                runtime.render(timestamp);
            });
        }

        return () => {
            if (scheduler) {
                scheduler.stop();
            }
        };
    }, [isLiveWallpaperActive, activeWallpaper, audioState]);

    // Clean up runtime on unmount or wallpaper change
    useEffect(() => {
        return () => {
            if (schedulerRef.current) {
                schedulerRef.current.stop();
            }
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
    if (!isLiveWallpaperActive || runtimeError) {
        // Static image wallpaper (existing behavior or fallback on error)
        return (
            <div
                className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-700 ease-in-out transform scale-105"
                style={{ backgroundImage: `url('${fallbackImage || ''}')` }}
            >
                <div className="absolute inset-0 bg-black/10 backdrop-blur-[0px]" />
                {runtimeError && (
                    <div className="absolute bottom-4 left-4 bg-red-900/80 text-white text-xs px-2 py-1 rounded">
                        Shader error: {runtimeError}
                    </div>
                )}
            </div>
        );
    }

    // Live wallpaper canvas
    return (
        <>
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
            {/* Microphone indicator (F092) */}
            {audioState === 'active' && (
                <div
                    className="absolute bottom-4 right-4 z-10 flex items-center gap-1 bg-black/50 text-white text-xs px-2 py-1 rounded"
                    title="Microphone active for audio-reactive wallpaper"
                >
                    <span className="material-icons text-red-400 text-sm animate-pulse">mic</span>
                    <span>Audio</span>
                </div>
            )}
            {audioState === 'denied' && (
                <div className="absolute bottom-4 right-4 z-10 bg-yellow-900/80 text-white text-xs px-2 py-1 rounded">
                    <span className="material-icons text-sm mr-1">mic_off</span>
                    Mic access denied
                </div>
            )}
        </>
    );
};

export default WallpaperHost;
