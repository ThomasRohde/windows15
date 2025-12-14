/**
 * Runtime Factory (F089, F090)
 *
 * Automatically selects and creates the best available shader runtime
 * based on browser capabilities. Prefers WebGPU, falls back to WebGL2.
 */

import type { WallpaperRuntime } from '../types/wallpaper';
import { ShaderWallpaperRuntime, isWebGPUAvailable, createShaderRuntimeFromUrl } from './ShaderWallpaperRuntime';
import { WebGL2ShaderRuntime, isWebGL2Available, createWebGL2RuntimeFromUrl } from './WebGL2ShaderRuntime';

/**
 * Runtime type enumeration
 */
export type RuntimeType = 'webgpu' | 'webgl2' | 'none';

/**
 * Detect the best available runtime for the current browser
 */
export function getPreferredRuntime(): RuntimeType {
    if (isWebGPUAvailable()) {
        return 'webgpu';
    }
    if (isWebGL2Available()) {
        return 'webgl2';
    }
    return 'none';
}

/**
 * Options for creating a shader runtime
 */
export interface CreateShaderRuntimeOptions {
    /** WGSL shader code for WebGPU */
    wgslCode?: string;
    /** GLSL shader code for WebGL2 fallback */
    glslCode?: string;
    /** URL to load WGSL shader from */
    wgslUrl?: string;
    /** URL to load GLSL shader from (fallback) */
    glslUrl?: string;
    /** Force a specific runtime type */
    forceRuntime?: RuntimeType;
}

/**
 * Create the best available shader runtime
 *
 * Priority order:
 * 1. WebGPU with WGSL shader
 * 2. WebGL2 with GLSL shader (fallback)
 *
 * @returns A promise resolving to the runtime, or null if no runtime is available
 */
export async function createShaderRuntime(options: CreateShaderRuntimeOptions = {}): Promise<WallpaperRuntime | null> {
    const { wgslCode, glslCode, wgslUrl, glslUrl, forceRuntime } = options;

    const preferredRuntime = forceRuntime ?? getPreferredRuntime();

    // Try WebGPU first
    if (preferredRuntime === 'webgpu') {
        try {
            if (wgslUrl) {
                return await createShaderRuntimeFromUrl(wgslUrl);
            }
            return new ShaderWallpaperRuntime(wgslCode);
        } catch (error) {
            console.warn('[RuntimeFactory] WebGPU initialization failed, trying WebGL2 fallback:', error);
            // Fall through to WebGL2
        }
    }

    // Try WebGL2
    if (preferredRuntime === 'webgl2' || (preferredRuntime === 'webgpu' && isWebGL2Available())) {
        try {
            if (glslUrl) {
                return await createWebGL2RuntimeFromUrl(glslUrl);
            }
            return new WebGL2ShaderRuntime(glslCode);
        } catch (error) {
            console.error('[RuntimeFactory] WebGL2 initialization failed:', error);
        }
    }

    console.warn('[RuntimeFactory] No shader runtime available');
    return null;
}

/**
 * Runtime capability information
 */
export interface RuntimeCapabilities {
    /** WebGPU support */
    webgpu: boolean;
    /** WebGL2 support */
    webgl2: boolean;
    /** Best available runtime */
    preferred: RuntimeType;
    /** Device description (if available) */
    deviceInfo?: string;
}

/**
 * Get runtime capabilities for the current browser
 */
export async function getRuntimeCapabilities(): Promise<RuntimeCapabilities> {
    const capabilities: RuntimeCapabilities = {
        webgpu: isWebGPUAvailable(),
        webgl2: isWebGL2Available(),
        preferred: getPreferredRuntime(),
    };

    // Try to get WebGPU device info
    if (capabilities.webgpu) {
        try {
            const adapter = await navigator.gpu.requestAdapter();
            if (adapter) {
                // adapterInfo is available in newer browsers via info property
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const adapterAny = adapter as any;
                if (adapterAny.info) {
                    const info = adapterAny.info;
                    capabilities.deviceInfo = `${info.vendor ?? ''} ${info.architecture ?? ''}`.trim() || 'Unknown GPU';
                }
            }
        } catch {
            // Ignore errors
        }
    }

    return capabilities;
}

export default createShaderRuntime;
