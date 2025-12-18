/**
 * Workers Module Index (F102)
 *
 * Exports for Web Worker wallpaper rendering.
 */

export { WorkerWallpaperRuntime, supportsOffscreenCanvas } from './WorkerWallpaperRuntime';
export type {
    WorkerMessage,
    WorkerResponse,
    InitPayload,
    ResizePayload,
    AudioPayload,
    SettingsPayload,
} from './WallpaperWorker';
