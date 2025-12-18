/**
 * WallpaperWorker (F102)
 *
 * Web Worker that handles wallpaper rendering using OffscreenCanvas.
 * This moves GPU rendering off the main thread to prevent UI jank.
 *
 * Message Protocol:
 * - 'init': Initialize with OffscreenCanvas and settings
 * - 'resize': Update canvas dimensions
 * - 'settings': Update wallpaper settings
 * - 'audio': Pass audio frequency data
 * - 'start': Start render loop
 * - 'stop': Stop render loop
 * - 'dispose': Clean up resources
 */

import type { WallpaperSettings } from '../types/wallpaper';

/**
 * Message types from main thread to worker
 */
export interface WorkerMessage {
    type: 'init' | 'resize' | 'settings' | 'audio' | 'start' | 'stop' | 'dispose';
    payload?: unknown;
}

export interface InitPayload {
    canvas: OffscreenCanvas;
    settings: WallpaperSettings;
    shaderUrl?: string;
    glslUrl?: string;
}

export interface ResizePayload {
    width: number;
    height: number;
    dpr: number;
}

export interface AudioPayload {
    frequencies: Float32Array;
    level: number;
}

export interface SettingsPayload {
    settings: WallpaperSettings;
}

/**
 * Response types from worker to main thread
 */
export interface WorkerResponse {
    type: 'ready' | 'error' | 'initialized' | 'stopped';
    payload?: unknown;
}

// Worker-side implementation
let canvas: OffscreenCanvas | null = null;
let gl: WebGL2RenderingContext | null = null;
let settings: WallpaperSettings | null = null;
let running = false;
let animationId: number | null = null;

// Shader program state
let program: WebGLProgram | null = null;
let uniformLocations: Record<string, WebGLUniformLocation | null> = {};
let startTime = 0;
let lastFrameTime = 0;

// Audio data
const audioFrequencies: Float32Array = new Float32Array(4);
let audioLevel = 0;

// Default fragment shader (gradient)
const defaultVertexShader = `#version 300 es
in vec4 a_position;
void main() {
    gl_Position = a_position;
}`;

const defaultFragmentShader = `#version 300 es
precision highp float;

uniform float u_time;
uniform float u_deltaTime;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_intensity;
uniform float u_audioReactive;
uniform vec4 u_audioFreq;
uniform float u_audioLevel;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float t = u_time * 0.3;
    
    float r = 0.5 + 0.5 * sin(uv.x * 3.14159 + t);
    float g = 0.5 + 0.5 * sin(uv.y * 3.14159 + t + 2.094);
    float b = 0.5 + 0.5 * sin((uv.x + uv.y) * 2.0 + t + 4.188);
    
    float audioBoost = 1.0 + u_audioLevel * u_audioReactive * 0.3;
    
    fragColor = vec4(
        clamp(r * audioBoost, 0.0, 1.0),
        clamp(g * audioBoost, 0.0, 1.0),
        clamp(b * audioBoost, 0.0, 1.0),
        1.0
    );
}`;

/**
 * Create and compile a shader
 */
function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        console.error('[WallpaperWorker] Shader compile error:', info);
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

/**
 * Create shader program
 */
function createProgram(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram | null {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

    if (!vertexShader || !fragmentShader) return null;

    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program);
        console.error('[WallpaperWorker] Program link error:', info);
        gl.deleteProgram(program);
        return null;
    }

    return program;
}

/**
 * Initialize WebGL context and shaders
 */
function initWebGL(offscreen: OffscreenCanvas, fragmentShaderSource?: string): boolean {
    gl = offscreen.getContext('webgl2', {
        alpha: false,
        antialias: false,
        powerPreference: 'low-power',
    }) as WebGL2RenderingContext | null;

    if (!gl) {
        console.error('[WallpaperWorker] WebGL2 not available in worker');
        return false;
    }

    // Create program
    program = createProgram(gl, defaultVertexShader, fragmentShaderSource || defaultFragmentShader);
    if (!program) return false;

    // Get uniform locations
    uniformLocations = {
        u_time: gl.getUniformLocation(program, 'u_time'),
        u_deltaTime: gl.getUniformLocation(program, 'u_deltaTime'),
        u_resolution: gl.getUniformLocation(program, 'u_resolution'),
        u_mouse: gl.getUniformLocation(program, 'u_mouse'),
        u_intensity: gl.getUniformLocation(program, 'u_intensity'),
        u_audioReactive: gl.getUniformLocation(program, 'u_audioReactive'),
        u_audioFreq: gl.getUniformLocation(program, 'u_audioFreq'),
        u_audioLevel: gl.getUniformLocation(program, 'u_audioLevel'),
    };

    // Create fullscreen quad
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    // Set up vertex attribute
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    return true;
}

/**
 * Render a single frame
 */
function renderFrame(timestamp: number): void {
    if (!gl || !program || !canvas) return;

    const elapsed = (timestamp - startTime) / 1000;
    const deltaTime = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(program);

    // Set uniforms
    if (uniformLocations.u_time) gl.uniform1f(uniformLocations.u_time, elapsed);
    if (uniformLocations.u_deltaTime) gl.uniform1f(uniformLocations.u_deltaTime, deltaTime);
    if (uniformLocations.u_resolution) gl.uniform2f(uniformLocations.u_resolution, canvas.width, canvas.height);
    if (uniformLocations.u_mouse) gl.uniform2f(uniformLocations.u_mouse, 0, 0);
    if (uniformLocations.u_intensity) gl.uniform1f(uniformLocations.u_intensity, settings?.intensity ?? 1.0);
    if (uniformLocations.u_audioReactive)
        gl.uniform1f(uniformLocations.u_audioReactive, settings?.audioReactive ? 1.0 : 0.0);
    if (uniformLocations.u_audioFreq) gl.uniform4fv(uniformLocations.u_audioFreq, audioFrequencies);
    if (uniformLocations.u_audioLevel) gl.uniform1f(uniformLocations.u_audioLevel, audioLevel);

    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

/**
 * Main render loop
 */
function renderLoop(timestamp: number): void {
    if (!running) return;

    renderFrame(timestamp);

    // Request next frame - requestAnimationFrame works in Workers!
    animationId = requestAnimationFrame(renderLoop);
}

/**
 * Handle messages from main thread
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { type, payload } = event.data;

    switch (type) {
        case 'init': {
            const initPayload = payload as InitPayload;
            canvas = initPayload.canvas;
            settings = initPayload.settings;

            // Try to fetch custom shader if provided
            let fragmentShader: string | undefined;
            if (initPayload.glslUrl) {
                try {
                    const response = await fetch(initPayload.glslUrl);
                    if (response.ok) {
                        fragmentShader = await response.text();
                    }
                } catch (e) {
                    console.warn('[WallpaperWorker] Failed to fetch shader:', e);
                }
            }

            const success = initWebGL(canvas, fragmentShader);

            if (success) {
                startTime = performance.now();
                lastFrameTime = startTime;
                self.postMessage({ type: 'initialized' } as WorkerResponse);
            } else {
                self.postMessage({
                    type: 'error',
                    payload: 'Failed to initialize WebGL in worker',
                } as WorkerResponse);
            }
            break;
        }

        case 'resize': {
            const resizePayload = payload as ResizePayload;
            if (canvas) {
                canvas.width = Math.floor(resizePayload.width * resizePayload.dpr);
                canvas.height = Math.floor(resizePayload.height * resizePayload.dpr);
            }
            break;
        }

        case 'settings': {
            const settingsPayload = payload as SettingsPayload;
            settings = settingsPayload.settings;
            break;
        }

        case 'audio': {
            const audioPayload = payload as AudioPayload;
            // Copy the frequency data to avoid type issues with transferred buffers
            audioFrequencies.set(audioPayload.frequencies);
            audioLevel = audioPayload.level;
            break;
        }

        case 'start':
            if (!running) {
                running = true;
                startTime = performance.now();
                lastFrameTime = startTime;
                animationId = requestAnimationFrame(renderLoop);
            }
            break;

        case 'stop':
            running = false;
            if (animationId !== null) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
            self.postMessage({ type: 'stopped' } as WorkerResponse);
            break;

        case 'dispose':
            running = false;
            if (animationId !== null) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
            if (gl && program) {
                gl.deleteProgram(program);
                program = null;
            }
            gl = null;
            canvas = null;
            settings = null;
            break;
    }
};

// Signal that worker is ready
self.postMessage({ type: 'ready' } as WorkerResponse);

export {};
