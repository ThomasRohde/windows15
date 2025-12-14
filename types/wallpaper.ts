/**
 * Wallpaper Runtime Types (F085)
 *
 * Defines the interface for live wallpaper runtimes and settings.
 */

/**
 * Wallpaper quality settings
 */
export type WallpaperQuality = 'low' | 'med' | 'high';

/**
 * Wallpaper settings passed to runtime
 */
export interface WallpaperSettings {
    /** Intensity/brightness level (0..1) */
    intensity: number;
    /** FPS cap (15, 30, 60) */
    fpsCap: 15 | 30 | 60;
    /** Rendering quality */
    quality: WallpaperQuality;
    /** Audio reactive mode enabled */
    audioReactive: boolean;
    /** Microphone sensitivity for audio reactive mode (0..1) */
    micSensitivity: number;
}

/**
 * Context passed to wallpaper runtime on initialization
 */
export interface WallpaperContext {
    /** Canvas element for rendering (HTMLCanvasElement or OffscreenCanvas) */
    canvas: HTMLCanvasElement;
    /** Initial settings */
    settings: WallpaperSettings;
}

/**
 * Interface all wallpaper runtimes must implement
 */
export interface WallpaperRuntime {
    /**
     * Initialize the wallpaper runtime
     * Called once when wallpaper is selected
     */
    init(ctx: WallpaperContext): Promise<void>;

    /**
     * Handle canvas resize
     * Called when viewport dimensions change
     */
    resize(width: number, height: number, dpr: number): void;

    /**
     * Update settings dynamically
     * Called when user changes preferences
     */
    setSettings(settings: WallpaperSettings): void;

    /**
     * Render a single frame
     * Called by the scheduler at the configured FPS
     * @param nowMs Current timestamp in milliseconds
     */
    render(nowMs: number): void;

    /**
     * Clean up resources
     * Called when wallpaper is switched or disposed
     */
    dispose(): void;
}

/**
 * Wallpaper manifest (parsed from wallpaper.json)
 */
export interface WallpaperManifest {
    /** Unique wallpaper identifier */
    id: string;
    /** Display name */
    name: string;
    /** Runtime type */
    type: 'shader' | 'scene' | 'image';
    /** Entry point file (shader or scene definition) */
    entry?: string;
    /** Fallback entry for WebGL2 when WebGPU unavailable */
    fallback?: string;
    /** Preview image path */
    preview?: string;
    /** Tags for categorization */
    tags?: string[];
    /** Default settings */
    defaultSettings?: Partial<WallpaperSettings>;
}

/**
 * Default wallpaper settings
 */
export const DEFAULT_WALLPAPER_SETTINGS: WallpaperSettings = {
    intensity: 0.7,
    fpsCap: 30,
    quality: 'med',
    audioReactive: false,
    micSensitivity: 0.5,
};
