/**
 * WebGL2ShaderRuntime (F090)
 *
 * WebGL2-based shader wallpaper runtime as fallback for browsers without WebGPU.
 * Implements WallpaperRuntime interface with GLSL shaders.
 *
 * Features:
 * - Compiles and runs GLSL fragment shaders (ES 3.0)
 * - Standard uniform layout matching WebGPU runtime
 * - Handles context loss and recovery
 * - Fullscreen quad rendering
 */

import type { WallpaperRuntime, WallpaperContext, WallpaperSettings } from '../types/wallpaper';

/**
 * Fullscreen quad vertex shader (GLSL ES 3.0)
 */
const VERTEX_SHADER_GLSL = /* glsl */ `#version 300 es
precision highp float;

out vec2 vUv;

void main() {
    // Fullscreen triangle using vertex index
    float x = float((gl_VertexID & 1) << 2) - 1.0;
    float y = float((gl_VertexID & 2) << 1) - 1.0;
    
    vUv = vec2(x * 0.5 + 0.5, 1.0 - (y * 0.5 + 0.5));
    gl_Position = vec4(x, y, 0.0, 1.0);
}
`;

/**
 * Default fragment shader (GLSL ES 3.0)
 */
const DEFAULT_FRAGMENT_SHADER_GLSL = /* glsl */ `#version 300 es
precision highp float;

uniform float uTime;
uniform float uDeltaTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uIntensity;
uniform float uAudioReactive;
uniform vec4 uAudioFreq;
uniform float uAudioLevel;

in vec2 vUv;
out vec4 fragColor;

void main() {
    float t = uTime * 0.5;
    vec2 center = vec2(0.5, 0.5);
    float d = distance(vUv, center);
    
    // Animated gradient
    float r = 0.5 + 0.5 * sin(t + vUv.x * 3.0);
    float g = 0.5 + 0.5 * sin(t + vUv.y * 3.0 + 2.094);
    float b = 0.5 + 0.5 * sin(t + d * 5.0 + 4.188);
    
    // Apply intensity
    vec3 color = vec3(r, g, b) * uIntensity;
    
    fragColor = vec4(color, 1.0);
}
`;

/**
 * Check if WebGL2 is available in the current browser
 */
export function isWebGL2Available(): boolean {
    if (typeof document === 'undefined') return false;
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    return gl !== null;
}

/**
 * WebGL2ShaderRuntime implements WallpaperRuntime for WebGL2 shaders
 */
export class WebGL2ShaderRuntime implements WallpaperRuntime {
    private gl: WebGL2RenderingContext | null = null;
    private program: WebGLProgram | null = null;
    private vao: WebGLVertexArrayObject | null = null;

    private canvas: HTMLCanvasElement | null = null;
    private settings: WallpaperSettings | null = null;
    private shaderCode: string;
    private startTime = 0;
    private lastFrameTime = 0;

    // Uniform locations
    private uniformLocations: {
        time: WebGLUniformLocation | null;
        deltaTime: WebGLUniformLocation | null;
        resolution: WebGLUniformLocation | null;
        mouse: WebGLUniformLocation | null;
        intensity: WebGLUniformLocation | null;
        audioReactive: WebGLUniformLocation | null;
        audioFreq: WebGLUniformLocation | null;
        audioLevel: WebGLUniformLocation | null;
    } = {
        time: null,
        deltaTime: null,
        resolution: null,
        mouse: null,
        intensity: null,
        audioReactive: null,
        audioFreq: null,
        audioLevel: null,
    };

    // Mouse tracking
    private mouseX = 0;
    private mouseY = 0;
    private mouseMoveHandler: ((e: MouseEvent) => void) | null = null;

    // Audio data
    private audioFrequencies = new Float32Array(4);
    private audioLevel = 0;

    // Context loss handling
    private contextLostHandler: ((e: Event) => void) | null = null;
    private contextRestoredHandler: ((e: Event) => void) | null = null;
    private isContextLost = false;

    /**
     * Create a new WebGL2ShaderRuntime
     * @param shaderCode GLSL fragment shader code (optional, uses default if not provided)
     */
    constructor(shaderCode?: string) {
        this.shaderCode = shaderCode || DEFAULT_FRAGMENT_SHADER_GLSL;
    }

    /**
     * Initialize WebGL2 context and shader program
     */
    async init(ctx: WallpaperContext): Promise<void> {
        this.canvas = ctx.canvas;
        this.settings = ctx.settings;
        this.startTime = performance.now();
        this.lastFrameTime = this.startTime;

        if (!isWebGL2Available()) {
            throw new Error('WebGL2 is not supported in this browser');
        }

        await this.initializeContext();
        this.setupMouseTracking();
        this.setupContextLossHandling();
    }

    /**
     * Initialize or reinitialize the WebGL2 context and program
     */
    private async initializeContext(): Promise<void> {
        if (!this.canvas) return;

        try {
            // Get WebGL2 context
            this.gl = this.canvas.getContext('webgl2', {
                alpha: false,
                antialias: false,
                depth: false,
                stencil: false,
                powerPreference: 'low-power',
                preserveDrawingBuffer: false,
            }) as WebGL2RenderingContext;

            if (!this.gl) {
                throw new Error('Failed to get WebGL2 context');
            }

            // Compile shaders
            const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, VERTEX_SHADER_GLSL);
            const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, this.shaderCode);

            // Create and link program
            this.program = this.gl.createProgram();
            if (!this.program) {
                throw new Error('Failed to create shader program');
            }

            this.gl.attachShader(this.program, vertexShader);
            this.gl.attachShader(this.program, fragmentShader);
            this.gl.linkProgram(this.program);

            if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
                const info = this.gl.getProgramInfoLog(this.program);
                throw new Error(`Failed to link program: ${info}`);
            }

            // Clean up shader objects
            this.gl.deleteShader(vertexShader);
            this.gl.deleteShader(fragmentShader);

            // Get uniform locations
            this.uniformLocations = {
                time: this.gl.getUniformLocation(this.program, 'uTime'),
                deltaTime: this.gl.getUniformLocation(this.program, 'uDeltaTime'),
                resolution: this.gl.getUniformLocation(this.program, 'uResolution'),
                mouse: this.gl.getUniformLocation(this.program, 'uMouse'),
                intensity: this.gl.getUniformLocation(this.program, 'uIntensity'),
                audioReactive: this.gl.getUniformLocation(this.program, 'uAudioReactive'),
                audioFreq: this.gl.getUniformLocation(this.program, 'uAudioFreq'),
                audioLevel: this.gl.getUniformLocation(this.program, 'uAudioLevel'),
            };

            // Create VAO for fullscreen quad
            this.vao = this.gl.createVertexArray();
            this.gl.bindVertexArray(this.vao);

            // Set clear color
            this.gl.clearColor(0, 0, 0, 1);

            console.log('[WebGL2ShaderRuntime] Initialized successfully');
        } catch (error) {
            console.error('[WebGL2ShaderRuntime] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Compile a shader
     */
    private compileShader(type: number, source: string): WebGLShader {
        if (!this.gl) {
            throw new Error('WebGL2 context not available');
        }

        const shader = this.gl.createShader(type);
        if (!shader) {
            throw new Error('Failed to create shader');
        }

        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const info = this.gl.getShaderInfoLog(shader);
            this.gl.deleteShader(shader);
            throw new Error(`Shader compilation error: ${info}`);
        }

        return shader;
    }

    /**
     * Set up mouse position tracking
     */
    private setupMouseTracking(): void {
        this.mouseMoveHandler = (e: MouseEvent) => {
            if (this.canvas) {
                this.mouseX = e.clientX / this.canvas.clientWidth;
                this.mouseY = 1.0 - e.clientY / this.canvas.clientHeight;
            }
        };
        document.addEventListener('mousemove', this.mouseMoveHandler);
    }

    /**
     * Set up WebGL context loss handling
     */
    private setupContextLossHandling(): void {
        if (!this.canvas) return;

        this.contextLostHandler = (e: Event) => {
            e.preventDefault();
            this.isContextLost = true;
            console.warn('[WebGL2ShaderRuntime] Context lost');
        };

        this.contextRestoredHandler = async () => {
            console.log('[WebGL2ShaderRuntime] Context restored, reinitializing...');
            try {
                await this.initializeContext();
                this.isContextLost = false;
            } catch (error) {
                console.error('[WebGL2ShaderRuntime] Failed to restore context:', error);
            }
        };

        this.canvas.addEventListener('webglcontextlost', this.contextLostHandler);
        this.canvas.addEventListener('webglcontextrestored', this.contextRestoredHandler);
    }

    /**
     * Handle canvas resize
     */
    resize(width: number, height: number, dpr: number): void {
        if (!this.canvas || !this.gl) return;

        this.canvas.width = Math.floor(width * dpr);
        this.canvas.height = Math.floor(height * dpr);
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Update settings dynamically
     */
    setSettings(settings: WallpaperSettings): void {
        this.settings = settings;
    }

    /**
     * Set audio data from external analyzer
     */
    setAudioData(frequencies: Float32Array, level: number): void {
        this.audioFrequencies.set(frequencies.slice(0, 4));
        this.audioLevel = level;
    }

    /**
     * Render a single frame
     */
    render(nowMs: number): void {
        if (!this.gl || !this.program || !this.vao || this.isContextLost) {
            return;
        }

        const deltaTime = (nowMs - this.lastFrameTime) / 1000;
        this.lastFrameTime = nowMs;
        const time = (nowMs - this.startTime) / 1000;

        // Clear and set up
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.useProgram(this.program);
        this.gl.bindVertexArray(this.vao);

        // Update uniforms
        if (this.uniformLocations.time) {
            this.gl.uniform1f(this.uniformLocations.time, time);
        }
        if (this.uniformLocations.deltaTime) {
            this.gl.uniform1f(this.uniformLocations.deltaTime, deltaTime);
        }
        if (this.uniformLocations.resolution) {
            this.gl.uniform2f(
                this.uniformLocations.resolution,
                this.canvas?.width ?? 1920,
                this.canvas?.height ?? 1080
            );
        }
        if (this.uniformLocations.mouse) {
            this.gl.uniform2f(this.uniformLocations.mouse, this.mouseX, this.mouseY);
        }
        if (this.uniformLocations.intensity) {
            this.gl.uniform1f(this.uniformLocations.intensity, this.settings?.intensity ?? 0.7);
        }
        if (this.uniformLocations.audioReactive) {
            this.gl.uniform1f(this.uniformLocations.audioReactive, this.settings?.audioReactive ? 1.0 : 0.0);
        }
        if (this.uniformLocations.audioFreq) {
            this.gl.uniform4fv(this.uniformLocations.audioFreq, this.audioFrequencies);
        }
        if (this.uniformLocations.audioLevel) {
            this.gl.uniform1f(this.uniformLocations.audioLevel, this.audioLevel);
        }

        // Draw fullscreen triangle
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
    }

    /**
     * Clean up all resources
     */
    dispose(): void {
        // Remove event listeners
        if (this.mouseMoveHandler) {
            document.removeEventListener('mousemove', this.mouseMoveHandler);
            this.mouseMoveHandler = null;
        }

        if (this.canvas) {
            if (this.contextLostHandler) {
                this.canvas.removeEventListener('webglcontextlost', this.contextLostHandler);
            }
            if (this.contextRestoredHandler) {
                this.canvas.removeEventListener('webglcontextrestored', this.contextRestoredHandler);
            }
        }

        // Clean up WebGL resources
        if (this.gl) {
            if (this.vao) {
                this.gl.deleteVertexArray(this.vao);
                this.vao = null;
            }
            if (this.program) {
                this.gl.deleteProgram(this.program);
                this.program = null;
            }
        }

        this.gl = null;
        this.canvas = null;

        console.log('[WebGL2ShaderRuntime] Disposed');
    }

    /**
     * Update the shader code and recreate program
     */
    async updateShader(shaderCode: string): Promise<void> {
        this.shaderCode = shaderCode;
        if (this.gl) {
            await this.initializeContext();
        }
    }
}

/**
 * Create a shader runtime from a GLSL file URL
 */
export async function createWebGL2RuntimeFromUrl(url: string): Promise<WebGL2ShaderRuntime> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load shader from ${url}: ${response.statusText}`);
    }
    const shaderCode = await response.text();
    return new WebGL2ShaderRuntime(shaderCode);
}

export default WebGL2ShaderRuntime;
