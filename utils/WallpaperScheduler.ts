/**
 * WallpaperScheduler (F086)
 *
 * Manages the render loop for live wallpapers with:
 * - Configurable FPS cap (15/30/60)
 * - Battery saver mode (auto-caps to 30 FPS, reduces resolution)
 * - Pause/resume on visibility changes
 * - Frame budget management to avoid starving main thread
 */

import type { WallpaperSettings } from '../types/wallpaper';

export interface SchedulerConfig {
    /** FPS cap from settings */
    fpsCap: 15 | 30 | 60;
    /** Enable battery saver mode */
    batterySaver: boolean;
    /** Quality setting affects resolution scaling */
    quality: 'low' | 'med' | 'high';
}

export interface SchedulerStats {
    /** Current measured FPS */
    currentFps: number;
    /** Number of frames rendered */
    frameCount: number;
    /** Time spent rendering in ms */
    totalRenderTime: number;
    /** Average frame time in ms */
    avgFrameTime: number;
    /** Dropped frames due to budget exceeded */
    droppedFrames: number;
}

type RenderCallback = (timestamp: number, deltaMs: number) => void;

/**
 * Frame budget in milliseconds - if a frame takes longer than this,
 * we yield to the main thread next frame
 */
const FRAME_BUDGET_MS = 12; // ~83fps max to leave headroom

/**
 * Battery saver FPS cap
 */
const BATTERY_SAVER_FPS_CAP = 30;

/**
 * Resolution scale factors by quality
 */
const QUALITY_SCALE_FACTORS: Record<'low' | 'med' | 'high', number> = {
    low: 0.5,
    med: 0.75,
    high: 1.0,
};

/**
 * WallpaperScheduler manages the render loop for live wallpapers
 */
export class WallpaperScheduler {
    private config: SchedulerConfig;
    private isRunning = false;
    private isPaused = false;
    private animationFrameId: number | null = null;
    private lastFrameTime = 0;
    private lastRenderStart = 0;
    private lastRenderDuration = 0;
    private renderCallback: RenderCallback | null = null;

    // Stats tracking
    private frameCount = 0;
    private totalRenderTime = 0;
    private droppedFrames = 0;
    private fpsWindow: number[] = [];
    private readonly FPS_WINDOW_SIZE = 60;

    // Visibility tracking
    private visibilityHandler: (() => void) | null = null;
    private isDocumentVisible = !document.hidden;

    // Battery status API
    private batteryManager: BatteryManager | null = null;
    private isOnBattery = false;

    constructor(config: Partial<SchedulerConfig> = {}) {
        this.config = {
            fpsCap: config.fpsCap ?? 30,
            batterySaver: config.batterySaver ?? false,
            quality: config.quality ?? 'med',
        };

        this.setupVisibilityListener();
        this.setupBatteryListener();
    }

    /**
     * Get the current effective FPS cap (considering battery saver)
     */
    get effectiveFpsCap(): number {
        if (this.config.batterySaver && this.isOnBattery) {
            return Math.min(this.config.fpsCap, BATTERY_SAVER_FPS_CAP);
        }
        return this.config.fpsCap;
    }

    /**
     * Get resolution scale factor for current settings
     */
    get resolutionScale(): number {
        const baseScale = QUALITY_SCALE_FACTORS[this.config.quality];
        // Further reduce resolution in battery saver mode
        if (this.config.batterySaver && this.isOnBattery) {
            return baseScale * 0.75;
        }
        return baseScale;
    }

    /**
     * Get current scheduler stats
     */
    getStats(): SchedulerStats {
        const avgFps =
            this.fpsWindow.length > 0 ? this.fpsWindow.reduce((a, b) => a + b, 0) / this.fpsWindow.length : 0;

        return {
            currentFps: Math.round(avgFps * 10) / 10,
            frameCount: this.frameCount,
            totalRenderTime: this.totalRenderTime,
            avgFrameTime: this.frameCount > 0 ? this.totalRenderTime / this.frameCount : 0,
            droppedFrames: this.droppedFrames,
        };
    }

    /**
     * Update scheduler configuration
     */
    updateConfig(config: Partial<SchedulerConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Update from WallpaperSettings
     */
    updateFromSettings(settings: WallpaperSettings): void {
        this.updateConfig({
            fpsCap: settings.fpsCap,
            quality: settings.quality,
        });
    }

    /**
     * Start the render loop with the provided callback
     */
    start(callback: RenderCallback): void {
        if (this.isRunning) {
            console.warn('[WallpaperScheduler] Already running');
            return;
        }

        this.renderCallback = callback;
        this.isRunning = true;
        this.isPaused = false;
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.totalRenderTime = 0;
        this.droppedFrames = 0;
        this.fpsWindow = [];

        this.scheduleNextFrame();
    }

    /**
     * Stop the render loop completely
     */
    stop(): void {
        this.isRunning = false;
        this.isPaused = false;
        this.renderCallback = null;

        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Pause rendering (e.g., when hidden behind overview or tab hidden)
     */
    pause(): void {
        if (!this.isRunning) return;
        this.isPaused = true;
    }

    /**
     * Resume rendering after pause
     */
    resume(): void {
        if (!this.isRunning || !this.isPaused) return;
        this.isPaused = false;
        this.lastFrameTime = performance.now();
        this.scheduleNextFrame();
    }

    /**
     * Dispose of the scheduler and clean up resources
     */
    dispose(): void {
        this.stop();

        // Remove visibility listener
        if (this.visibilityHandler) {
            document.removeEventListener('visibilitychange', this.visibilityHandler);
            this.visibilityHandler = null;
        }

        // Battery API doesn't need explicit cleanup
        this.batteryManager = null;
    }

    /**
     * Schedule the next animation frame
     */
    private scheduleNextFrame(): void {
        if (!this.isRunning || this.isPaused) return;

        this.animationFrameId = requestAnimationFrame(this.tick.bind(this));
    }

    /**
     * Main render loop tick
     */
    private tick(timestamp: number): void {
        // Clear animation frame ID since we're now in the callback
        this.animationFrameId = null;

        // Check if we should still be running
        if (!this.isRunning || this.isPaused || !this.isDocumentVisible) {
            // Still schedule next frame to check state, but don't render
            if (this.isRunning && !this.isPaused) {
                this.scheduleNextFrame();
            }
            return;
        }

        const frameInterval = 1000 / this.effectiveFpsCap;
        const elapsed = timestamp - this.lastFrameTime;

        // Check if enough time has passed for next frame
        if (elapsed < frameInterval) {
            this.scheduleNextFrame();
            return;
        }

        // Check if previous frame exceeded budget - skip this frame to catch up
        if (this.lastRenderDuration > FRAME_BUDGET_MS && this.frameCount > 0) {
            this.droppedFrames++;
            this.lastRenderDuration = 0; // Reset so we don't keep dropping
            this.lastFrameTime = timestamp;
            this.scheduleNextFrame();
            return;
        }

        // Calculate delta time, capping at reasonable max (e.g., 100ms)
        const deltaMs = Math.min(elapsed, 100);

        // Record render start time
        this.lastRenderStart = performance.now();

        // Call the render callback
        if (this.renderCallback) {
            try {
                this.renderCallback(timestamp, deltaMs);
            } catch (error) {
                console.error('[WallpaperScheduler] Render callback error:', error);
            }
        }

        // Track render duration
        this.lastRenderDuration = performance.now() - this.lastRenderStart;
        this.totalRenderTime += this.lastRenderDuration;
        this.frameCount++;

        // Update FPS tracking window
        const instantFps = 1000 / elapsed;
        this.fpsWindow.push(instantFps);
        if (this.fpsWindow.length > this.FPS_WINDOW_SIZE) {
            this.fpsWindow.shift();
        }

        // Adjust last frame time to maintain smooth interval
        this.lastFrameTime = timestamp - (elapsed % frameInterval);

        // Schedule next frame
        this.scheduleNextFrame();
    }

    /**
     * Set up Page Visibility API listener
     */
    private setupVisibilityListener(): void {
        this.visibilityHandler = () => {
            this.isDocumentVisible = !document.hidden;

            if (this.isDocumentVisible && this.isRunning && !this.isPaused) {
                // Resume after becoming visible
                this.lastFrameTime = performance.now();
                this.scheduleNextFrame();
            }
        };

        document.addEventListener('visibilitychange', this.visibilityHandler);
    }

    /**
     * Set up Battery Status API listener (if available)
     */
    private async setupBatteryListener(): Promise<void> {
        // Battery Status API is deprecated but still useful for power savings
        if (!('getBattery' in navigator)) {
            return;
        }

        try {
            this.batteryManager = await (navigator as NavigatorWithBattery).getBattery();

            const updateBatteryStatus = () => {
                if (this.batteryManager) {
                    this.isOnBattery = !this.batteryManager.charging;
                }
            };

            updateBatteryStatus();

            this.batteryManager.addEventListener('chargingchange', updateBatteryStatus);
        } catch (error) {
            // Battery API not available or denied
            console.debug('[WallpaperScheduler] Battery API unavailable:', error);
        }
    }
}

/**
 * Battery Manager interface
 * Note: This is a non-standard API, so we define the interface here
 */
interface BatteryManager {
    readonly charging: boolean;
    readonly chargingTime: number;
    readonly dischargingTime: number;
    readonly level: number;
    addEventListener(type: 'chargingchange' | 'levelchange', listener: () => void): void;
    removeEventListener(type: 'chargingchange' | 'levelchange', listener: () => void): void;
}

/**
 * Navigator extended with Battery API
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getBattery
 */
interface NavigatorWithBattery {
    getBattery(): Promise<BatteryManager>;
}

/**
 * Create a scheduler instance with default settings
 */
export function createWallpaperScheduler(config?: Partial<SchedulerConfig>): WallpaperScheduler {
    return new WallpaperScheduler(config);
}

export default WallpaperScheduler;
