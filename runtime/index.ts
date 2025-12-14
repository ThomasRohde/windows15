/**
 * Runtime Module Index
 *
 * Exports wallpaper runtime implementations for WebGPU and WebGL2 fallback.
 */

export { ShaderWallpaperRuntime, isWebGPUAvailable, createShaderRuntimeFromUrl } from './ShaderWallpaperRuntime';
export { WebGL2ShaderRuntime, isWebGL2Available, createWebGL2RuntimeFromUrl } from './WebGL2ShaderRuntime';
export { createShaderRuntime, getPreferredRuntime } from './runtimeFactory';
