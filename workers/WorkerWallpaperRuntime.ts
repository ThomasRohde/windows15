/**
 * WorkerWallpaperRuntime (F102)
 *
 * Wrapper for managing the WallpaperWorker from the main thread.
 * Uses OffscreenCanvas to transfer rendering to a Web Worker.
 * Provides fallback to main-thread rendering if OffscreenCanvas is unavailable.
 */

import type { WallpaperSettings, WallpaperRuntime, WallpaperContext } from '../types/wallpaper';
import type {
    WorkerMessage,
    WorkerResponse,
    InitPayload,
    ResizePayload,
    AudioPayload,
    SettingsPayload,
} from './WallpaperWorker';

/**
 * Check if OffscreenCanvas is supported
 */
export function supportsOffscreenCanvas(): boolean {
    return typeof OffscreenCanvas !== 'undefined' && 'transferControlToOffscreen' in HTMLCanvasElement.prototype;
}

/**
 * Options for WorkerWallpaperRuntime
 */
export interface WorkerRuntimeOptions {
    shaderUrl?: string;
    glslUrl?: string;
}

/**
 * WorkerWallpaperRuntime - Manages wallpaper rendering in a Web Worker
 */
export class WorkerWallpaperRuntime implements WallpaperRuntime {
    private worker: Worker | null = null;
    private offscreenCanvas: OffscreenCanvas | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private settings: WallpaperSettings | null = null;
    private isInitialized = false;
    private isRunning = false;
    private options: WorkerRuntimeOptions;

    constructor(options: WorkerRuntimeOptions = {}) {
        this.options = options;
    }

    /**
     * Check if this runtime type is supported
     */
    static isSupported(): boolean {
        return supportsOffscreenCanvas();
    }

    /**
     * Get runtime name
     */
    getName(): string {
        return 'worker-webgl2';
    }

    /**
     * Initialize the worker and transfer canvas control
     */
    async init(ctx: WallpaperContext): Promise<void> {
        if (!supportsOffscreenCanvas()) {
            throw new Error('OffscreenCanvas not supported in this browser');
        }

        this.canvas = ctx.canvas;
        this.settings = ctx.settings;

        // Create Web Worker using Vite's worker import syntax
        this.worker = new Worker(new URL('./WallpaperWorker.ts', import.meta.url), {
            type: 'module',
        });

        // Wait for worker to be ready
        await this.waitForWorkerMessage('ready');

        // Transfer canvas control to worker
        this.offscreenCanvas = this.canvas.transferControlToOffscreen();

        // Send init message with transferred canvas
        const initPayload: InitPayload = {
            canvas: this.offscreenCanvas,
            settings: this.settings,
            shaderUrl: this.options.shaderUrl,
            glslUrl: this.options.glslUrl,
        };

        this.worker.postMessage(
            { type: 'init', payload: initPayload } as WorkerMessage,
            [this.offscreenCanvas] // Transfer ownership
        );

        // Wait for initialization confirmation
        const response = await this.waitForWorkerMessage('initialized', 'error');
        if (response.type === 'error') {
            throw new Error(response.payload as string);
        }

        this.isInitialized = true;
        console.log('[WorkerWallpaperRuntime] Initialized with OffscreenCanvas');
    }

    /**
     * Wait for a specific message type from worker
     */
    private waitForWorkerMessage(...expectedTypes: string[]): Promise<WorkerResponse> {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error('Worker not created'));
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error('Worker message timeout'));
            }, 5000);

            const handler = (event: MessageEvent<WorkerResponse>) => {
                if (expectedTypes.includes(event.data.type)) {
                    clearTimeout(timeout);
                    this.worker?.removeEventListener('message', handler);
                    resolve(event.data);
                }
            };

            this.worker.addEventListener('message', handler);
        });
    }

    /**
     * Start the render loop in the worker
     */
    render(_timestamp: number): void {
        // In worker mode, render is called once to start the loop
        if (!this.isRunning && this.worker && this.isInitialized) {
            this.worker.postMessage({ type: 'start' } as WorkerMessage);
            this.isRunning = true;
        }
    }

    /**
     * Handle canvas resize
     */
    resize(width: number, height: number, dpr: number): void {
        if (!this.worker || !this.isInitialized) return;

        const payload: ResizePayload = { width, height, dpr };
        this.worker.postMessage({ type: 'resize', payload } as WorkerMessage);
    }

    /**
     * Update wallpaper settings
     */
    setSettings(settings: WallpaperSettings): void {
        this.settings = settings;

        if (!this.worker || !this.isInitialized) return;

        const payload: SettingsPayload = { settings };
        this.worker.postMessage({ type: 'settings', payload } as WorkerMessage);
    }

    /**
     * Pass audio data to the worker
     */
    setAudioData(frequencies: Float32Array, level: number): void {
        if (!this.worker || !this.isInitialized) return;

        const payload: AudioPayload = { frequencies, level };
        this.worker.postMessage({ type: 'audio', payload } as WorkerMessage);
    }

    /**
     * Get current state
     */
    getState(): { isRunning: boolean; fps: number } {
        return {
            isRunning: this.isRunning,
            fps: this.settings?.fpsCap ?? 30,
        };
    }

    /**
     * Stop the render loop
     */
    stop(): void {
        if (this.worker && this.isRunning) {
            this.worker.postMessage({ type: 'stop' } as WorkerMessage);
            this.isRunning = false;
        }
    }

    /**
     * Clean up all resources
     */
    dispose(): void {
        if (this.worker) {
            this.worker.postMessage({ type: 'dispose' } as WorkerMessage);
            this.worker.terminate();
            this.worker = null;
        }

        this.offscreenCanvas = null;
        this.canvas = null;
        this.settings = null;
        this.isInitialized = false;
        this.isRunning = false;
    }
}

export default WorkerWallpaperRuntime;
