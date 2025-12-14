/**
 * ShaderWallpaperRuntime (F089)
 *
 * WebGPU-based shader wallpaper runtime that implements WallpaperRuntime interface.
 * Supports WGSL shaders with standardized uniform buffer layout.
 *
 * Features:
 * - Compiles and runs WGSL fragment shaders
 * - Standard uniform buffer: time, resolution, mouse, audio bands
 * - Handles device loss and recovery
 * - Fullscreen quad rendering
 */

import type { WallpaperRuntime, WallpaperContext, WallpaperSettings } from '../types/wallpaper';

/**
 * Standard uniform buffer layout (128 bytes, aligned to 16 bytes)
 *
 * struct Uniforms {
 *   time: f32,           // offset 0
 *   deltaTime: f32,      // offset 4
 *   resolution: vec2f,   // offset 8
 *   mouse: vec2f,        // offset 16
 *   intensity: f32,      // offset 24
 *   audioReactive: f32,  // offset 28
 *   audioFreq: vec4f,    // offset 32 (4 frequency bands: bass, lowMid, highMid, treble)
 *   audioLevel: f32,     // offset 48
 *   padding: vec3f,      // offset 52 (padding to 64 bytes for alignment)
 * };
 */
const UNIFORM_BUFFER_SIZE = 64;

/**
 * Fullscreen quad vertex shader (shared by all fragment shaders)
 */
const VERTEX_SHADER = /* wgsl */ `
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

@vertex
fn main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    // Fullscreen triangle that covers the entire screen
    var positions = array<vec2f, 3>(
        vec2f(-1.0, -1.0),
        vec2f(3.0, -1.0),
        vec2f(-1.0, 3.0)
    );
    
    var uvs = array<vec2f, 3>(
        vec2f(0.0, 1.0),
        vec2f(2.0, 1.0),
        vec2f(0.0, -1.0)
    );
    
    var output: VertexOutput;
    output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
    output.uv = uvs[vertexIndex];
    return output;
}
`;

/**
 * Default fragment shader (gradient for testing)
 */
const DEFAULT_FRAGMENT_SHADER = /* wgsl */ `
struct Uniforms {
    time: f32,
    deltaTime: f32,
    resolution: vec2f,
    mouse: vec2f,
    intensity: f32,
    audioReactive: f32,
    audioFreq: vec4f,
    audioLevel: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
    let t = uniforms.time * 0.5;
    let center = vec2f(0.5, 0.5);
    let d = distance(uv, center);
    
    // Animated gradient
    let r = 0.5 + 0.5 * sin(t + uv.x * 3.0);
    let g = 0.5 + 0.5 * sin(t + uv.y * 3.0 + 2.094);
    let b = 0.5 + 0.5 * sin(t + d * 5.0 + 4.188);
    
    // Apply intensity
    let color = vec3f(r, g, b) * uniforms.intensity;
    
    return vec4f(color, 1.0);
}
`;

/**
 * Check if WebGPU is available in the current browser
 */
export function isWebGPUAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

/**
 * ShaderWallpaperRuntime implements WallpaperRuntime for WebGPU shaders
 */
export class ShaderWallpaperRuntime implements WallpaperRuntime {
    private device: GPUDevice | null = null;
    private context: GPUCanvasContext | null = null;
    private pipeline: GPURenderPipeline | null = null;
    private uniformBuffer: GPUBuffer | null = null;
    private bindGroup: GPUBindGroup | null = null;
    private format: GPUTextureFormat = 'bgra8unorm';

    private canvas: HTMLCanvasElement | null = null;
    private settings: WallpaperSettings | null = null;
    private shaderCode: string;
    private startTime = 0;
    private lastFrameTime = 0;

    // Mouse tracking
    private mouseX = 0;
    private mouseY = 0;
    private mouseMoveHandler: ((e: MouseEvent) => void) | null = null;

    // Audio data (set externally by audio analyzer)
    private audioFrequencies = new Float32Array(4); // bass, lowMid, highMid, treble
    private audioLevel = 0;

    // Device lost recovery
    private isRecovering = false;
    private deviceLostHandler: ((info: GPUDeviceLostInfo) => void) | null = null;

    /**
     * Create a new ShaderWallpaperRuntime
     * @param shaderCode WGSL fragment shader code (optional, uses default if not provided)
     */
    constructor(shaderCode?: string) {
        this.shaderCode = shaderCode || DEFAULT_FRAGMENT_SHADER;
    }

    /**
     * Initialize WebGPU device and render pipeline
     */
    async init(ctx: WallpaperContext): Promise<void> {
        this.canvas = ctx.canvas;
        this.settings = ctx.settings;
        this.startTime = performance.now();
        this.lastFrameTime = this.startTime;

        if (!isWebGPUAvailable()) {
            throw new Error('WebGPU is not supported in this browser');
        }

        await this.initializeDevice();
        this.setupMouseTracking();
    }

    /**
     * Initialize or reinitialize the WebGPU device and pipeline
     */
    private async initializeDevice(): Promise<void> {
        if (!this.canvas) return;

        try {
            // Request adapter
            const adapter = await navigator.gpu.requestAdapter({
                powerPreference: 'low-power', // Prefer battery efficiency for wallpaper
            });

            if (!adapter) {
                throw new Error('No WebGPU adapter found');
            }

            // Request device
            this.device = await adapter.requestDevice({
                label: 'WallpaperDevice',
            });

            // Handle device loss
            this.deviceLostHandler = (info: GPUDeviceLostInfo) => {
                console.warn('[ShaderWallpaperRuntime] Device lost:', info.message);
                if (info.reason !== 'destroyed') {
                    this.recoverFromDeviceLoss();
                }
            };
            this.device.lost.then(this.deviceLostHandler);

            // Configure canvas context
            this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;
            if (!this.context) {
                throw new Error('Failed to get WebGPU context');
            }

            this.format = navigator.gpu.getPreferredCanvasFormat();
            this.context.configure({
                device: this.device,
                format: this.format,
                alphaMode: 'opaque',
            });

            // Create shader modules
            const vertexModule = this.device.createShaderModule({
                label: 'WallpaperVertexShader',
                code: VERTEX_SHADER,
            });

            const fragmentModule = this.device.createShaderModule({
                label: 'WallpaperFragmentShader',
                code: this.shaderCode,
            });

            // Check for compilation errors
            const vertexInfo = await vertexModule.getCompilationInfo();
            const fragmentInfo = await fragmentModule.getCompilationInfo();

            for (const msg of [...vertexInfo.messages, ...fragmentInfo.messages]) {
                if (msg.type === 'error') {
                    console.error('[ShaderWallpaperRuntime] Shader compilation error:', msg.message);
                    throw new Error(`Shader compilation error: ${msg.message}`);
                }
            }

            // Create uniform buffer
            this.uniformBuffer = this.device.createBuffer({
                label: 'WallpaperUniforms',
                size: UNIFORM_BUFFER_SIZE,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });

            // Create bind group layout and bind group
            const bindGroupLayout = this.device.createBindGroupLayout({
                label: 'WallpaperBindGroupLayout',
                entries: [
                    {
                        binding: 0,
                        visibility: GPUShaderStage.FRAGMENT,
                        buffer: { type: 'uniform' },
                    },
                ],
            });

            this.bindGroup = this.device.createBindGroup({
                label: 'WallpaperBindGroup',
                layout: bindGroupLayout,
                entries: [
                    {
                        binding: 0,
                        resource: { buffer: this.uniformBuffer },
                    },
                ],
            });

            // Create pipeline layout
            const pipelineLayout = this.device.createPipelineLayout({
                label: 'WallpaperPipelineLayout',
                bindGroupLayouts: [bindGroupLayout],
            });

            // Create render pipeline
            this.pipeline = this.device.createRenderPipeline({
                label: 'WallpaperPipeline',
                layout: pipelineLayout,
                vertex: {
                    module: vertexModule,
                    entryPoint: 'main',
                },
                fragment: {
                    module: fragmentModule,
                    entryPoint: 'main',
                    targets: [{ format: this.format }],
                },
                primitive: {
                    topology: 'triangle-list',
                },
            });

            console.log('[ShaderWallpaperRuntime] Initialized successfully');
        } catch (error) {
            console.error('[ShaderWallpaperRuntime] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Attempt to recover from device loss
     */
    private async recoverFromDeviceLoss(): Promise<void> {
        if (this.isRecovering) return;
        this.isRecovering = true;

        console.log('[ShaderWallpaperRuntime] Attempting device recovery...');

        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            await this.initializeDevice();
            console.log('[ShaderWallpaperRuntime] Device recovered successfully');
        } catch (error) {
            console.error('[ShaderWallpaperRuntime] Device recovery failed:', error);
        } finally {
            this.isRecovering = false;
        }
    }

    /**
     * Set up mouse position tracking
     */
    private setupMouseTracking(): void {
        this.mouseMoveHandler = (e: MouseEvent) => {
            if (this.canvas) {
                this.mouseX = e.clientX / this.canvas.clientWidth;
                this.mouseY = 1.0 - e.clientY / this.canvas.clientHeight; // Flip Y for shader coords
            }
        };
        document.addEventListener('mousemove', this.mouseMoveHandler);
    }

    /**
     * Handle canvas resize
     */
    resize(width: number, height: number, dpr: number): void {
        if (!this.canvas || !this.device || !this.context) return;

        // Update canvas size
        this.canvas.width = Math.floor(width * dpr);
        this.canvas.height = Math.floor(height * dpr);

        // Reconfigure context with new size
        this.context.configure({
            device: this.device,
            format: this.format,
            alphaMode: 'opaque',
        });
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
        if (!this.device || !this.context || !this.pipeline || !this.uniformBuffer || !this.bindGroup) {
            return;
        }

        if (this.isRecovering) return;

        const deltaTime = (nowMs - this.lastFrameTime) / 1000;
        this.lastFrameTime = nowMs;
        const time = (nowMs - this.startTime) / 1000;

        // Update uniform buffer
        const uniformData = new Float32Array([
            time, // time
            deltaTime, // deltaTime
            this.canvas?.width ?? 1920, // resolution.x
            this.canvas?.height ?? 1080, // resolution.y
            this.mouseX, // mouse.x
            this.mouseY, // mouse.y
            this.settings?.intensity ?? 0.7, // intensity
            this.settings?.audioReactive ? 1.0 : 0.0, // audioReactive
            this.audioFrequencies[0] ?? 0, // audioFreq.x (bass)
            this.audioFrequencies[1] ?? 0, // audioFreq.y (lowMid)
            this.audioFrequencies[2] ?? 0, // audioFreq.z (highMid)
            this.audioFrequencies[3] ?? 0, // audioFreq.w (treble)
            this.audioLevel, // audioLevel
            0, // padding
            0, // padding
            0, // padding
        ]);

        this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

        // Get current texture
        let currentTexture: GPUTexture;
        try {
            currentTexture = this.context.getCurrentTexture();
        } catch {
            // Context might be invalid during resize
            return;
        }

        // Create command encoder
        const commandEncoder = this.device.createCommandEncoder({
            label: 'WallpaperCommandEncoder',
        });

        // Begin render pass
        const renderPass = commandEncoder.beginRenderPass({
            label: 'WallpaperRenderPass',
            colorAttachments: [
                {
                    view: currentTexture.createView(),
                    loadOp: 'clear',
                    storeOp: 'store',
                    clearValue: { r: 0, g: 0, b: 0, a: 1 },
                },
            ],
        });

        renderPass.setPipeline(this.pipeline);
        renderPass.setBindGroup(0, this.bindGroup);
        renderPass.draw(3); // Fullscreen triangle
        renderPass.end();

        // Submit commands
        this.device.queue.submit([commandEncoder.finish()]);
    }

    /**
     * Clean up all resources
     */
    dispose(): void {
        // Remove mouse listener
        if (this.mouseMoveHandler) {
            document.removeEventListener('mousemove', this.mouseMoveHandler);
            this.mouseMoveHandler = null;
        }

        // Destroy GPU resources
        if (this.uniformBuffer) {
            this.uniformBuffer.destroy();
            this.uniformBuffer = null;
        }

        if (this.device) {
            this.device.destroy();
            this.device = null;
        }

        this.context = null;
        this.pipeline = null;
        this.bindGroup = null;
        this.canvas = null;

        console.log('[ShaderWallpaperRuntime] Disposed');
    }

    /**
     * Update the shader code and recreate pipeline
     */
    async updateShader(shaderCode: string): Promise<void> {
        this.shaderCode = shaderCode;
        if (this.device) {
            // Recreate the fragment shader module and pipeline
            await this.initializeDevice();
        }
    }
}

/**
 * Create a shader runtime from a WGSL file URL
 */
export async function createShaderRuntimeFromUrl(url: string): Promise<ShaderWallpaperRuntime> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load shader from ${url}: ${response.statusText}`);
    }
    const shaderCode = await response.text();
    return new ShaderWallpaperRuntime(shaderCode);
}

export default ShaderWallpaperRuntime;
