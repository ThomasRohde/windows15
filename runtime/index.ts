/**
 * Runtime Module Index
 *
 * Exports wallpaper runtime implementations for WebGPU, WebGL2 fallback,
 * and Web Worker offloading (F102).
 */

export { ShaderWallpaperRuntime, isWebGPUAvailable, createShaderRuntimeFromUrl } from './ShaderWallpaperRuntime';
export { WebGL2ShaderRuntime, isWebGL2Available, createWebGL2RuntimeFromUrl } from './WebGL2ShaderRuntime';
export { createShaderRuntime, getPreferredRuntime, getRuntimeCapabilities } from './runtimeFactory';
export type { RuntimeType, RuntimeCapabilities, CreateShaderRuntimeOptions } from './runtimeFactory';

// Re-export worker runtime (F102)
export { WorkerWallpaperRuntime, supportsOffscreenCanvas } from '../workers';
