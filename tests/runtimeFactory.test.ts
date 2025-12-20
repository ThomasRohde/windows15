import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { WallpaperRuntime } from '../types/wallpaper';

const mocks = vi.hoisted(() => {
    const shaderRuntime = {} as WallpaperRuntime;
    const webglRuntime = {} as WallpaperRuntime;
    const workerRuntime = {} as WallpaperRuntime;

    return {
        shaderRuntime,
        webglRuntime,
        workerRuntime,
        ShaderWallpaperRuntime: vi.fn(function () {
            return shaderRuntime;
        }),
        WebGL2ShaderRuntime: vi.fn(function () {
            return webglRuntime;
        }),
        WorkerWallpaperRuntime: vi.fn(function () {
            return workerRuntime;
        }),
        createShaderRuntimeFromUrl: vi.fn(async () => shaderRuntime),
        createWebGL2RuntimeFromUrl: vi.fn(async () => webglRuntime),
        isWebGPUAvailable: vi.fn(() => true),
        isWebGL2Available: vi.fn(() => true),
        supportsOffscreenCanvas: vi.fn(() => true),
    };
});

vi.mock('../runtime/ShaderWallpaperRuntime', () => ({
    ShaderWallpaperRuntime: mocks.ShaderWallpaperRuntime,
    isWebGPUAvailable: mocks.isWebGPUAvailable,
    createShaderRuntimeFromUrl: mocks.createShaderRuntimeFromUrl,
}));

vi.mock('../runtime/WebGL2ShaderRuntime', () => ({
    WebGL2ShaderRuntime: mocks.WebGL2ShaderRuntime,
    isWebGL2Available: mocks.isWebGL2Available,
    createWebGL2RuntimeFromUrl: mocks.createWebGL2RuntimeFromUrl,
}));

vi.mock('../workers', () => ({
    WorkerWallpaperRuntime: mocks.WorkerWallpaperRuntime,
    supportsOffscreenCanvas: mocks.supportsOffscreenCanvas,
}));

import { createShaderRuntime } from '../runtime/runtimeFactory';

describe('createShaderRuntime', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.isWebGPUAvailable.mockReturnValue(true);
        mocks.isWebGL2Available.mockReturnValue(true);
        mocks.supportsOffscreenCanvas.mockReturnValue(true);
        mocks.createShaderRuntimeFromUrl.mockResolvedValue(mocks.shaderRuntime);
        mocks.createWebGL2RuntimeFromUrl.mockResolvedValue(mocks.webglRuntime);
        mocks.ShaderWallpaperRuntime.mockImplementation(function () {
            return mocks.shaderRuntime;
        });
        mocks.WebGL2ShaderRuntime.mockImplementation(function () {
            return mocks.webglRuntime;
        });
        mocks.WorkerWallpaperRuntime.mockImplementation(function () {
            return mocks.workerRuntime;
        });
    });

    it('uses WebGL2 when only GLSL is available', async () => {
        const runtime = await createShaderRuntime({ glslUrl: 'shader.glsl' });

        expect(mocks.createWebGL2RuntimeFromUrl).toHaveBeenCalledWith('shader.glsl');
        expect(mocks.createShaderRuntimeFromUrl).not.toHaveBeenCalled();
        expect(mocks.WorkerWallpaperRuntime).not.toHaveBeenCalled();
        expect(runtime).toBe(mocks.webglRuntime);
    });

    it('skips worker when GLSL is missing', async () => {
        const runtime = await createShaderRuntime({ wgslUrl: 'shader.wgsl', useWorker: true });

        expect(mocks.WorkerWallpaperRuntime).not.toHaveBeenCalled();
        expect(mocks.createShaderRuntimeFromUrl).toHaveBeenCalledWith('shader.wgsl');
        expect(runtime).toBe(mocks.shaderRuntime);
    });

    it('uses worker when GLSL code is provided', async () => {
        const runtime = await createShaderRuntime({ glslCode: 'void main() {}', useWorker: true });

        expect(mocks.WorkerWallpaperRuntime).toHaveBeenCalledWith(
            expect.objectContaining({ glslCode: 'void main() {}' })
        );
        expect(mocks.createShaderRuntimeFromUrl).not.toHaveBeenCalled();
        expect(mocks.createWebGL2RuntimeFromUrl).not.toHaveBeenCalled();
        expect(runtime).toBe(mocks.workerRuntime);
    });
});
