/**
 * WallpaperHost Component (F085, F089, F090, F092)
 *
 * Renders live wallpaper behind desktop icons and windows.
 * Manages wallpaper lifecycle and canvas resizing.
 * Uses WallpaperScheduler (F086) for render loop management.
 * Integrates WebGPU (F089) and WebGL2 fallback (F090) runtimes.
 * Supports audio-reactive mode with microphone input (F092).
 */
import React, { useRef, useEffect, useState } from 'react';
import { useWallpaper } from '../context/WallpaperContext';
import type { WallpaperRuntime } from '../types/wallpaper';
import { WallpaperScheduler } from '../utils/WallpaperScheduler';
import { createShaderRuntime, getPreferredRuntime, type RuntimeType } from '../runtime';
import { AudioAnalyzer, type AnalyzerState } from '../utils/audio';

interface WallpaperHostProps {
    /** Fallback image URL when no live wallpaper is active */
    fallbackImage?: string;
    /** Enable battery saver mode */
    batterySaver?: boolean;
}

const stripQueryHash = (value: string): string => value.split('?')[0].split('#')[0];

const getShaderLanguage = (value?: string): 'wgsl' | 'glsl' | null => {
    if (!value) return null;
    const normalized = stripQueryHash(value).toLowerCase();
    if (normalized.endsWith('.wgsl')) return 'wgsl';
    if (normalized.endsWith('.glsl') || normalized.endsWith('.frag') || normalized.endsWith('.vert')) return 'glsl';
    return null;
};

const resolveShaderUrls = (
    entry?: string,
    fallback?: string
): {
    wgslUrl?: string;
    glslUrl?: string;
} => {
    const entryType = getShaderLanguage(entry);
    const fallbackType = getShaderLanguage(fallback);
    let wgslUrl: string | undefined;
    let glslUrl: string | undefined;

    if (entryType === 'wgsl') {
        wgslUrl = entry;
    } else if (entryType === 'glsl') {
        glslUrl = entry;
    }

    if (!glslUrl && fallbackType === 'glsl') {
        glslUrl = fallback;
    }

    if (!wgslUrl && fallbackType === 'wgsl' && entryType !== 'glsl') {
        wgslUrl = fallback;
    }

    return { wgslUrl, glslUrl };
};

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
    const { activeManifest, activeWallpaper: activeWallpaperUrl, settings } = useWallpaper();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const runtimeRef = useRef<WallpaperRuntime | null>(null);
    const schedulerRef = useRef<WallpaperScheduler | null>(null);
    const audioAnalyzerRef = useRef<AudioAnalyzer | null>(null);

    const [runtimeType, setRuntimeType] = useState<RuntimeType>('none');
    const [runtimeError, setRuntimeError] = useState<string | null>(null);
    const [audioState, setAudioState] = useState<AnalyzerState>('inactive');

    // Refs for values needed in render loop but shouldn't trigger re-init
    const settingsRef = useRef(settings);
    const audioStateRef = useRef(audioState);
    const batterySaverRef = useRef(batterySaver);

    // Keep refs in sync
    useEffect(() => {
        settingsRef.current = settings;
    }, [settings]);
    useEffect(() => {
        audioStateRef.current = audioState;
    }, [audioState]);
    useEffect(() => {
        batterySaverRef.current = batterySaver;
    }, [batterySaver]);

    // Determine if we have a live wallpaper active
    const activeManifestType = activeManifest?.type;
    const activeManifestEntry = activeManifest?.entry;
    const activeManifestFallback = activeManifest?.fallback;
    const isLiveWallpaperActive = activeManifestType === 'shader';

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

    // Single effect to manage entire shader runtime lifecycle
    // This handles init, render loop, and cleanup in one place to avoid race conditions
    useEffect(() => {
        if (!isLiveWallpaperActive || !activeManifestEntry || activeManifestType !== 'shader') {
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;

        let disposed = false;
        let runtime: WallpaperRuntime | null = null;

        const initAndRun = async () => {
            try {
                setRuntimeError(null);

                const { wgslUrl, glslUrl } = resolveShaderUrls(activeManifestEntry, activeManifestFallback);
                if (!wgslUrl && !glslUrl) {
                    throw new Error('Unsupported shader entry format');
                }

                // Create runtime with shader URLs from manifest
                runtime = await createShaderRuntime({
                    wgslUrl,
                    glslUrl,
                });

                if (!runtime) {
                    throw new Error('No compatible shader runtime available');
                }

                // Check if we were disposed during async init
                if (disposed) {
                    runtime.dispose();
                    return;
                }

                // Initialize with canvas and current settings
                await runtime.init({
                    canvas,
                    settings: settingsRef.current,
                });

                // Check again after init
                if (disposed) {
                    runtime.dispose();
                    return;
                }

                runtimeRef.current = runtime;
                console.log(`[WallpaperHost] Shader runtime initialized (${runtimeType})`);

                // Create and start scheduler for render loop
                const scheduler = new WallpaperScheduler({
                    fpsCap: settingsRef.current.fpsCap,
                    batterySaver: batterySaverRef.current,
                    quality: settingsRef.current.quality,
                });
                schedulerRef.current = scheduler;

                // Initial canvas sizing
                const dpr = window.devicePixelRatio || 1;
                const scale = scheduler.resolutionScale ?? 1;
                const width = window.innerWidth;
                const height = window.innerHeight;
                canvas.width = Math.floor(width * dpr * scale);
                canvas.height = Math.floor(height * dpr * scale);
                canvas.style.width = `${width}px`;
                canvas.style.height = `${height}px`;
                runtime.resize(width, height, dpr * scale);

                // Handle window resize
                const handleResize = () => {
                    if (!runtime || disposed) return;
                    const dpr = window.devicePixelRatio || 1;
                    const scale = schedulerRef.current?.resolutionScale ?? 1;
                    const w = window.innerWidth;
                    const h = window.innerHeight;
                    canvas.width = Math.floor(w * dpr * scale);
                    canvas.height = Math.floor(h * dpr * scale);
                    canvas.style.width = `${w}px`;
                    canvas.style.height = `${h}px`;
                    runtime.resize(w, h, dpr * scale);
                };
                window.addEventListener('resize', handleResize);

                // Start render loop
                scheduler.start((timestamp: number) => {
                    if (disposed || !runtime) return;
                    // Pass audio data to runtime if available
                    if (audioAnalyzerRef.current && audioStateRef.current === 'active' && 'setAudioData' in runtime) {
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

                // Store cleanup handler for resize listener
                (scheduler as unknown as { _resizeHandler: () => void })._resizeHandler = handleResize;
            } catch (error) {
                console.error('[WallpaperHost] Failed to initialize shader runtime:', error);
                setRuntimeError(error instanceof Error ? error.message : 'Unknown error');
            }
        };

        void initAndRun();

        // Cleanup function
        return () => {
            disposed = true;
            if (schedulerRef.current) {
                const handler = (schedulerRef.current as unknown as { _resizeHandler?: () => void })._resizeHandler;
                if (handler) {
                    window.removeEventListener('resize', handler);
                }
                schedulerRef.current.stop();
                schedulerRef.current.dispose();
                schedulerRef.current = null;
            }
            if (runtimeRef.current) {
                runtimeRef.current.dispose();
                runtimeRef.current = null;
            }
        };
    }, [
        activeManifest?.id,
        activeManifestEntry,
        activeManifestFallback,
        activeManifestType,
        isLiveWallpaperActive,
        runtimeType,
    ]); // Only re-run when wallpaper changes

    // Update runtime settings when they change (without reinitializing)
    useEffect(() => {
        if (runtimeRef.current) {
            runtimeRef.current.setSettings(settings);
        }
        if (schedulerRef.current) {
            schedulerRef.current.updateFromSettings(settings);
            schedulerRef.current.updateConfig({ batterySaver });
        }
    }, [settings, batterySaver]);

    // Render static image fallback or canvas for live wallpaper
    if (!isLiveWallpaperActive || runtimeError) {
        // Static image wallpaper (existing behavior or fallback on error)
        const bgImage = fallbackImage || activeWallpaperUrl || '';
        return (
            <div
                className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-700 ease-in-out transform scale-105"
                style={{ backgroundImage: `url('${bgImage}')` }}
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
