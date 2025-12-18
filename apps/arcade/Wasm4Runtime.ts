/**
 * WASM-4 Runtime (F096)
 *
 * Manages the WASM-4 fantasy console runtime for running .wasm cartridges.
 * WASM-4 is a fantasy console with a fixed 160x160 resolution.
 *
 * Based on the WASM-4 specification: https://wasm4.org/docs
 */

/**
 * WASM-4 constants
 */
export const SCREEN_WIDTH = 160;
export const SCREEN_HEIGHT = 160;
export const FRAMEBUFFER_SIZE = (SCREEN_WIDTH * SCREEN_HEIGHT) / 4; // 2 bits per pixel

/**
 * WASM-4 color palette (default)
 */
export const DEFAULT_PALETTE = [
    0xe0f8cf, // Light green
    0x86c06c, // Mid-light green
    0x306850, // Mid-dark green
    0x071821, // Dark blue-green
];

/**
 * WASM-4 gamepad button flags
 */
export const BUTTON_1 = 1;
export const BUTTON_2 = 2;
export const BUTTON_LEFT = 16;
export const BUTTON_RIGHT = 32;
export const BUTTON_UP = 64;
export const BUTTON_DOWN = 128;

/**
 * WASM-4 memory addresses
 */
const PALETTE = 0x04;
const DRAW_COLORS = 0x14;
const GAMEPAD1 = 0x16;
const GAMEPAD2 = 0x17;
const GAMEPAD3 = 0x18;
const GAMEPAD4 = 0x19;
const MOUSE_X = 0x1a;
const MOUSE_Y = 0x1c;
const MOUSE_BUTTONS = 0x1e;
// Reserved for future use
const _SYSTEM_FLAGS = 0x1f;
const _NETPLAY = 0x20;
const FRAMEBUFFER = 0xa0;

/**
 * WASM-4 system flags (reserved for future use)
 */
const _SYSTEM_PRESERVE_FRAMEBUFFER = 1;
const _SYSTEM_HIDE_GAMEPAD_OVERLAY = 2;

/**
 * Runtime state
 */
export interface Wasm4State {
    isRunning: boolean;
    isPaused: boolean;
    fps: number;
    frameCount: number;
    lastError: string | null;
}

/**
 * Event callbacks
 */
export interface Wasm4Callbacks {
    onStateChange?: (state: Wasm4State) => void;
    onError?: (error: string) => void;
    onAudioReady?: () => void;
}

/**
 * WASM-4 Runtime Class
 */
export class Wasm4Runtime {
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private memory: WebAssembly.Memory | null = null;
    private instance: WebAssembly.Instance | null = null;
    private frameBuffer: Uint8Array | null = null;
    private imageData: ImageData | null = null;

    private animationFrameId: number | null = null;
    private lastFrameTime = 0;
    private frameCount = 0;
    private fps = 60;

    private gamepad = [0, 0, 0, 0];
    private mouseX = 0;
    private mouseY = 0;
    private mouseButtons = 0;

    private state: Wasm4State = {
        isRunning: false,
        isPaused: false,
        fps: 0,
        frameCount: 0,
        lastError: null,
    };

    private callbacks: Wasm4Callbacks = {};

    // Audio context (created lazily after user interaction)
    private audioCtx: AudioContext | null = null;

    // Input handlers
    private keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
    private keyUpHandler: ((e: KeyboardEvent) => void) | null = null;

    /**
     * Initialize the runtime with a canvas element
     */
    init(canvas: HTMLCanvasElement, callbacks?: Wasm4Callbacks): void {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.callbacks = callbacks ?? {};

        if (!this.ctx) {
            throw new Error('Failed to get 2D canvas context');
        }

        // Disable image smoothing for pixel-perfect rendering
        this.ctx.imageSmoothingEnabled = false;

        // Create image data buffer
        this.imageData = this.ctx.createImageData(SCREEN_WIDTH, SCREEN_HEIGHT);

        // Set up input handlers
        this.setupInputHandlers();
    }

    /**
     * Load and run a WASM cartridge
     */
    async loadCartridge(cartridgeData: ArrayBuffer): Promise<void> {
        if (!this.canvas || !this.ctx) {
            throw new Error('Runtime not initialized');
        }

        // Stop any running game
        this.stop();

        try {
            // Create WASM-4 memory (64KB)
            this.memory = new WebAssembly.Memory({ initial: 1, maximum: 1 });
            this.frameBuffer = new Uint8Array(this.memory.buffer);

            // Initialize default palette
            const memView = new DataView(this.memory.buffer);
            for (let i = 0; i < 4; i++) {
                memView.setUint32(PALETTE + i * 4, DEFAULT_PALETTE[i] ?? 0, true);
            }

            // Set default draw colors
            memView.setUint16(DRAW_COLORS, 0x1234, true);

            // Create import object for WASM-4 API
            const importObject = this.createImportObject();

            // Compile and instantiate
            const module = await WebAssembly.compile(cartridgeData);
            this.instance = await WebAssembly.instantiate(module, importObject);

            // Call start function if present
            const exports = this.instance.exports;
            if (typeof exports.start === 'function') {
                (exports.start as () => void)();
            } else if (typeof exports._start === 'function') {
                (exports._start as () => void)();
            }

            // Start the game loop
            this.start();

            this.updateState({ isRunning: true, isPaused: false, lastError: null });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            this.updateState({ isRunning: false, lastError: errorMsg });
            this.callbacks.onError?.(errorMsg);
            throw error;
        }
    }

    /**
     * Create the WASM-4 import object
     */
    private createImportObject(): WebAssembly.Imports {
        if (!this.memory) {
            throw new Error('Wasm4Runtime not initialized: missing memory');
        }
        return {
            env: {
                memory: this.memory,
                // Drawing functions
                blit: this.blit.bind(this),
                blitSub: this.blitSub.bind(this),
                line: this.line.bind(this),
                hline: this.hline.bind(this),
                vline: this.vline.bind(this),
                oval: this.oval.bind(this),
                rect: this.rect.bind(this),
                text: this.text.bind(this),
                textUtf8: this.textUtf8.bind(this),
                textUtf16: this.textUtf16.bind(this),
                // Sound
                tone: this.tone.bind(this),
                // Storage
                diskr: this.diskr.bind(this),
                diskw: this.diskw.bind(this),
                // Debug
                trace: this.trace.bind(this),
                traceUtf8: this.traceUtf8.bind(this),
                traceUtf16: this.traceUtf16.bind(this),
                tracef: this.tracef.bind(this),
            },
        };
    }

    /**
     * Start the game loop
     */
    start(): void {
        if (this.animationFrameId !== null) return;

        this.lastFrameTime = performance.now();
        this.state.isPaused = false;
        this.tick();
    }

    /**
     * Stop the game loop
     */
    stop(): void {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.instance = null;
        this.memory = null;
        this.frameBuffer = null;
        this.updateState({ isRunning: false, isPaused: false });
    }

    /**
     * Pause the game
     */
    pause(): void {
        this.updateState({ isPaused: true });
    }

    /**
     * Resume the game
     */
    resume(): void {
        if (this.state.isRunning) {
            this.updateState({ isPaused: false });
        }
    }

    /**
     * Reset the game
     */
    async reset(cartridgeData: ArrayBuffer): Promise<void> {
        await this.loadCartridge(cartridgeData);
    }

    /**
     * Game loop tick
     */
    private tick(): void {
        const now = performance.now();
        const elapsed = now - this.lastFrameTime;
        const targetFrameTime = 1000 / 60; // 60 FPS

        if (!this.state.isPaused && elapsed >= targetFrameTime) {
            this.frameCount++;
            this.lastFrameTime = now - (elapsed % targetFrameTime);

            // Update FPS calculation
            this.fps = Math.round(1000 / elapsed);

            // Update input state in memory
            this.updateInputMemory();

            // Call update function
            if (this.instance) {
                const exports = this.instance.exports;
                if (typeof exports.update === 'function') {
                    try {
                        (exports.update as () => void)();
                    } catch (error) {
                        const errorMsg = error instanceof Error ? error.message : 'Runtime error';
                        this.updateState({ lastError: errorMsg });
                        this.callbacks.onError?.(errorMsg);
                        this.stop();
                        return;
                    }
                }
            }

            // Render framebuffer
            this.render();

            this.updateState({ fps: this.fps, frameCount: this.frameCount });
        }

        this.animationFrameId = requestAnimationFrame(() => this.tick());
    }

    /**
     * Update input state in WASM memory
     */
    private updateInputMemory(): void {
        if (!this.memory) return;
        const mem = new DataView(this.memory.buffer);

        mem.setUint8(GAMEPAD1, this.gamepad[0] ?? 0);
        mem.setUint8(GAMEPAD2, this.gamepad[1] ?? 0);
        mem.setUint8(GAMEPAD3, this.gamepad[2] ?? 0);
        mem.setUint8(GAMEPAD4, this.gamepad[3] ?? 0);
        mem.setInt16(MOUSE_X, this.mouseX, true);
        mem.setInt16(MOUSE_Y, this.mouseY, true);
        mem.setUint8(MOUSE_BUTTONS, this.mouseButtons);
    }

    /**
     * Render the framebuffer to the canvas
     */
    private render(): void {
        if (!this.ctx || !this.imageData || !this.memory) {
            return;
        }

        const palette = this.getPalette();
        const mem = new Uint8Array(this.memory.buffer);
        const data = this.imageData.data;

        // Convert 2bpp framebuffer to RGBA
        for (let i = 0; i < SCREEN_WIDTH * SCREEN_HEIGHT; i++) {
            const byteIndex = FRAMEBUFFER + (i >> 2);
            const bitOffset = (i & 3) * 2;
            const byte = mem[byteIndex] ?? 0;
            const colorIndex = (byte >> bitOffset) & 0x3;
            const color = palette[colorIndex] ?? palette[0] ?? 0;

            const j = i * 4;
            data[j] = (color >> 16) & 0xff; // R
            data[j + 1] = (color >> 8) & 0xff; // G
            data[j + 2] = color & 0xff; // B
            data[j + 3] = 255; // A
        }

        this.ctx.putImageData(this.imageData, 0, 0);
    }

    /**
     * Get current palette from memory
     */
    private getPalette(): number[] {
        if (!this.memory) return DEFAULT_PALETTE;
        const mem = new DataView(this.memory.buffer);
        return [
            mem.getUint32(PALETTE, true),
            mem.getUint32(PALETTE + 4, true),
            mem.getUint32(PALETTE + 8, true),
            mem.getUint32(PALETTE + 12, true),
        ];
    }

    /**
     * Set up keyboard input handlers
     */
    private setupInputHandlers(): void {
        this.keyDownHandler = (e: KeyboardEvent) => this.handleKeyEvent(e, true);
        this.keyUpHandler = (e: KeyboardEvent) => this.handleKeyEvent(e, false);

        window.addEventListener('keydown', this.keyDownHandler);
        window.addEventListener('keyup', this.keyUpHandler);
    }

    /**
     * Public method to handle key down from canvas
     */
    handleKeyDown(e: React.KeyboardEvent | KeyboardEvent): void {
        this.handleKeyEvent(e as KeyboardEvent, true);
    }

    /**
     * Public method to handle key up from canvas
     */
    handleKeyUp(e: React.KeyboardEvent | KeyboardEvent): void {
        this.handleKeyEvent(e as KeyboardEvent, false);
    }

    /**
     * Handle keyboard input
     */
    private handleKeyEvent(e: KeyboardEvent, isDown: boolean): void {
        if (!this.state.isRunning) return;

        let button = 0;
        switch (e.code) {
            case 'KeyX':
            case 'KeyV':
            case 'Space':
            case 'Period':
                button = BUTTON_1;
                break;
            case 'KeyZ':
            case 'KeyC':
            case 'KeyN':
            case 'Comma':
                button = BUTTON_2;
                break;
            case 'ArrowUp':
            case 'KeyW':
                button = BUTTON_UP;
                break;
            case 'ArrowDown':
            case 'KeyS':
                button = BUTTON_DOWN;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                button = BUTTON_LEFT;
                break;
            case 'ArrowRight':
            case 'KeyD':
                button = BUTTON_RIGHT;
                break;
            default:
                return;
        }

        e.preventDefault();

        if (isDown) {
            this.gamepad[0] = (this.gamepad[0] ?? 0) | button;
        } else {
            this.gamepad[0] = (this.gamepad[0] ?? 0) & ~button;
        }
    }

    /**
     * Set gamepad button state (for virtual controls)
     */
    setGamepadButton(player: number, button: number, pressed: boolean): void {
        if (player < 0 || player > 3) return;
        if (pressed) {
            this.gamepad[player] = (this.gamepad[player] ?? 0) | button;
        } else {
            this.gamepad[player] = (this.gamepad[player] ?? 0) & ~button;
        }
    }

    /**
     * Set mouse position (for canvas mouse events)
     */
    setMouse(x: number, y: number): void {
        this.mouseX = Math.max(0, Math.min(SCREEN_WIDTH - 1, x));
        this.mouseY = Math.max(0, Math.min(SCREEN_HEIGHT - 1, y));
    }

    /**
     * Set mouse button state (for canvas mouse events)
     * Buttons: 1 = left, 2 = right, 4 = middle
     */
    setMouseButton(button: number, pressed: boolean): void {
        if (pressed) {
            this.mouseButtons |= button;
        } else {
            this.mouseButtons &= ~button;
        }
    }

    /**
     * Capture current frame as a Blob (for thumbnails/icons)
     */
    captureScreenshot(): Promise<Blob | null> {
        return new Promise(resolve => {
            if (!this.canvas) {
                resolve(null);
                return;
            }
            this.canvas.toBlob(blob => resolve(blob), 'image/png');
        });
    }

    /**
     * Update state and notify listeners
     */
    private updateState(partial: Partial<Wasm4State>): void {
        this.state = { ...this.state, ...partial };
        this.callbacks.onStateChange?.(this.state);
    }

    /**
     * Get current state
     */
    getState(): Wasm4State {
        return { ...this.state };
    }

    /**
     * Export current game state as a Blob (F098)
     * This exports the entire WASM memory for save states.
     */
    exportState(): Blob | null {
        if (!this.memory) return null;

        // Export the entire memory buffer
        const memoryData = new Uint8Array(this.memory.buffer);
        return new Blob([memoryData], { type: 'application/octet-stream' });
    }

    /**
     * Import a saved game state (F098)
     * This restores the entire WASM memory from a save state.
     */
    async importState(stateBlob: Blob): Promise<boolean> {
        if (!this.memory) return false;

        try {
            const arrayBuffer = await stateBlob.arrayBuffer();
            const savedData = new Uint8Array(arrayBuffer);
            const memoryData = new Uint8Array(this.memory.buffer);

            // Validate size matches
            if (savedData.length !== memoryData.length) {
                console.error('[Wasm4Runtime] Save state size mismatch');
                return false;
            }

            // Restore memory
            memoryData.set(savedData);
            return true;
        } catch (error) {
            console.error('[Wasm4Runtime] Failed to import state:', error);
            return false;
        }
    }

    /**
     * Dispose runtime resources
     */
    dispose(): void {
        this.stop();

        if (this.keyDownHandler) {
            window.removeEventListener('keydown', this.keyDownHandler);
        }
        if (this.keyUpHandler) {
            window.removeEventListener('keyup', this.keyUpHandler);
        }

        if (this.audioCtx) {
            this.audioCtx.close();
            this.audioCtx = null;
        }

        this.canvas = null;
        this.ctx = null;
        this.imageData = null;
    }

    // ===== WASM-4 API Implementation =====

    /**
     * Get draw colors from memory
     */
    private getDrawColors(): number {
        if (!this.memory) return 0x1234;
        const mem = new DataView(this.memory.buffer);
        return mem.getUint16(DRAW_COLORS, true);
    }

    /**
     * Set a pixel in the framebuffer
     */
    private setPixel(x: number, y: number, colorIndex: number): void {
        if (!this.memory || x < 0 || x >= SCREEN_WIDTH || y < 0 || y >= SCREEN_HEIGHT) return;
        if (colorIndex === 0) return; // Color 0 is transparent

        const actualColor = (colorIndex - 1) & 0x3; // Convert 1-4 to 0-3
        const i = y * SCREEN_WIDTH + x;
        const byteIndex = FRAMEBUFFER + (i >> 2);
        const bitOffset = (i & 3) * 2;

        const mem = new Uint8Array(this.memory.buffer);
        const mask = 0x3 << bitOffset;
        const current = mem[byteIndex] ?? 0;
        mem[byteIndex] = (current & ~mask) | (actualColor << bitOffset);
    }

    /**
     * Draw a horizontal line
     */
    private hline(x: number, y: number, len: number): void {
        const dc = this.getDrawColors();
        const strokeColor = dc & 0xf;
        if (strokeColor === 0) return;

        for (let i = 0; i < len; i++) {
            this.setPixel(x + i, y, strokeColor);
        }
    }

    /**
     * Draw a vertical line
     */
    private vline(x: number, y: number, len: number): void {
        const dc = this.getDrawColors();
        const strokeColor = dc & 0xf;
        if (strokeColor === 0) return;

        for (let i = 0; i < len; i++) {
            this.setPixel(x, y + i, strokeColor);
        }
    }

    /**
     * Draw a line using Bresenham's algorithm
     */
    private line(x1: number, y1: number, x2: number, y2: number): void {
        const dc = this.getDrawColors();
        const strokeColor = dc & 0xf;
        if (strokeColor === 0) return;

        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1;
        const sy = y1 < y2 ? 1 : -1;
        let err = dx - dy;

        let x = x1;
        let y = y1;

        while (true) {
            this.setPixel(x, y, strokeColor);
            if (x === x2 && y === y2) break;
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }
    }

    /**
     * Draw a filled/outlined rectangle
     */
    private rect(x: number, y: number, width: number, height: number): void {
        const dc = this.getDrawColors();
        const fillColor = (dc >> 4) & 0xf;
        const strokeColor = dc & 0xf;

        // Fill
        if (fillColor !== 0) {
            for (let py = 0; py < height; py++) {
                for (let px = 0; px < width; px++) {
                    this.setPixel(x + px, y + py, fillColor);
                }
            }
        }

        // Stroke (outline)
        if (strokeColor !== 0) {
            // Top and bottom
            for (let px = 0; px < width; px++) {
                this.setPixel(x + px, y, strokeColor);
                this.setPixel(x + px, y + height - 1, strokeColor);
            }
            // Left and right
            for (let py = 0; py < height; py++) {
                this.setPixel(x, y + py, strokeColor);
                this.setPixel(x + width - 1, y + py, strokeColor);
            }
        }
    }

    /**
     * Draw an oval
     */
    private oval(x: number, y: number, width: number, height: number): void {
        const dc = this.getDrawColors();
        const fillColor = (dc >> 4) & 0xf;
        const strokeColor = dc & 0xf;

        const a = width / 2;
        const b = height / 2;

        // Simple midpoint ellipse algorithm
        for (let py = 0; py < height; py++) {
            for (let px = 0; px < width; px++) {
                const dx = (px - a + 0.5) / a;
                const dy = (py - b + 0.5) / b;
                const dist = dx * dx + dy * dy;

                if (dist <= 1) {
                    // Check if on edge for stroke
                    const innerDx = (px - a + 0.5) / (a - 1);
                    const innerDy = (py - b + 0.5) / (b - 1);
                    const innerDist = innerDx * innerDx + innerDy * innerDy;

                    if (innerDist > 1 && strokeColor !== 0) {
                        this.setPixel(x + px, y + py, strokeColor);
                    } else if (fillColor !== 0) {
                        this.setPixel(x + px, y + py, fillColor);
                    }
                }
            }
        }
    }

    /**
     * WASM-4 built-in font (8x8 1bpp)
     */
    private static readonly FONT: Uint8Array = new Uint8Array([
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00, // 32: space
        0x00,
        0x10,
        0x10,
        0x10,
        0x10,
        0x00,
        0x10,
        0x00, // 33: !
        0x00,
        0x28,
        0x28,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00, // 34: "
        0x00,
        0x28,
        0x7c,
        0x28,
        0x28,
        0x7c,
        0x28,
        0x00, // 35: #
        0x00,
        0x10,
        0x3c,
        0x50,
        0x38,
        0x14,
        0x78,
        0x10, // 36: $
        0x00,
        0x60,
        0x64,
        0x08,
        0x10,
        0x26,
        0x06,
        0x00, // 37: %
        0x00,
        0x30,
        0x48,
        0x30,
        0x4a,
        0x44,
        0x3a,
        0x00, // 38: &
        0x00,
        0x10,
        0x10,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00, // 39: '
        0x00,
        0x08,
        0x10,
        0x10,
        0x10,
        0x10,
        0x08,
        0x00, // 40: (
        0x00,
        0x10,
        0x08,
        0x08,
        0x08,
        0x08,
        0x10,
        0x00, // 41: )
        0x00,
        0x00,
        0x28,
        0x10,
        0x7c,
        0x10,
        0x28,
        0x00, // 42: *
        0x00,
        0x00,
        0x10,
        0x10,
        0x7c,
        0x10,
        0x10,
        0x00, // 43: +
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x10,
        0x10,
        0x20, // 44: ,
        0x00,
        0x00,
        0x00,
        0x00,
        0x7c,
        0x00,
        0x00,
        0x00, // 45: -
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x10,
        0x00, // 46: .
        0x00,
        0x00,
        0x04,
        0x08,
        0x10,
        0x20,
        0x40,
        0x00, // 47: /
        0x00,
        0x38,
        0x4c,
        0x54,
        0x64,
        0x44,
        0x38,
        0x00, // 48: 0
        0x00,
        0x10,
        0x30,
        0x10,
        0x10,
        0x10,
        0x38,
        0x00, // 49: 1
        0x00,
        0x38,
        0x44,
        0x08,
        0x10,
        0x20,
        0x7c,
        0x00, // 50: 2
        0x00,
        0x38,
        0x44,
        0x18,
        0x04,
        0x44,
        0x38,
        0x00, // 51: 3
        0x00,
        0x08,
        0x18,
        0x28,
        0x48,
        0x7c,
        0x08,
        0x00, // 52: 4
        0x00,
        0x7c,
        0x40,
        0x78,
        0x04,
        0x44,
        0x38,
        0x00, // 53: 5
        0x00,
        0x18,
        0x20,
        0x78,
        0x44,
        0x44,
        0x38,
        0x00, // 54: 6
        0x00,
        0x7c,
        0x04,
        0x08,
        0x10,
        0x20,
        0x20,
        0x00, // 55: 7
        0x00,
        0x38,
        0x44,
        0x38,
        0x44,
        0x44,
        0x38,
        0x00, // 56: 8
        0x00,
        0x38,
        0x44,
        0x44,
        0x3c,
        0x08,
        0x30,
        0x00, // 57: 9
        0x00,
        0x00,
        0x10,
        0x00,
        0x00,
        0x10,
        0x00,
        0x00, // 58: :
        0x00,
        0x00,
        0x10,
        0x00,
        0x00,
        0x10,
        0x10,
        0x20, // 59: ;
        0x00,
        0x08,
        0x10,
        0x20,
        0x20,
        0x10,
        0x08,
        0x00, // 60: <
        0x00,
        0x00,
        0x00,
        0x7c,
        0x00,
        0x7c,
        0x00,
        0x00, // 61: =
        0x00,
        0x20,
        0x10,
        0x08,
        0x08,
        0x10,
        0x20,
        0x00, // 62: >
        0x00,
        0x38,
        0x44,
        0x08,
        0x10,
        0x00,
        0x10,
        0x00, // 63: ?
        0x00,
        0x38,
        0x44,
        0x5c,
        0x54,
        0x5c,
        0x40,
        0x38, // 64: @
        0x00,
        0x38,
        0x44,
        0x44,
        0x7c,
        0x44,
        0x44,
        0x00, // 65: A
        0x00,
        0x78,
        0x44,
        0x78,
        0x44,
        0x44,
        0x78,
        0x00, // 66: B
        0x00,
        0x38,
        0x44,
        0x40,
        0x40,
        0x44,
        0x38,
        0x00, // 67: C
        0x00,
        0x78,
        0x44,
        0x44,
        0x44,
        0x44,
        0x78,
        0x00, // 68: D
        0x00,
        0x7c,
        0x40,
        0x78,
        0x40,
        0x40,
        0x7c,
        0x00, // 69: E
        0x00,
        0x7c,
        0x40,
        0x78,
        0x40,
        0x40,
        0x40,
        0x00, // 70: F
        0x00,
        0x38,
        0x44,
        0x40,
        0x5c,
        0x44,
        0x38,
        0x00, // 71: G
        0x00,
        0x44,
        0x44,
        0x7c,
        0x44,
        0x44,
        0x44,
        0x00, // 72: H
        0x00,
        0x38,
        0x10,
        0x10,
        0x10,
        0x10,
        0x38,
        0x00, // 73: I
        0x00,
        0x04,
        0x04,
        0x04,
        0x04,
        0x44,
        0x38,
        0x00, // 74: J
        0x00,
        0x44,
        0x48,
        0x70,
        0x48,
        0x44,
        0x44,
        0x00, // 75: K
        0x00,
        0x40,
        0x40,
        0x40,
        0x40,
        0x40,
        0x7c,
        0x00, // 76: L
        0x00,
        0x44,
        0x6c,
        0x54,
        0x44,
        0x44,
        0x44,
        0x00, // 77: M
        0x00,
        0x44,
        0x64,
        0x54,
        0x4c,
        0x44,
        0x44,
        0x00, // 78: N
        0x00,
        0x38,
        0x44,
        0x44,
        0x44,
        0x44,
        0x38,
        0x00, // 79: O
        0x00,
        0x78,
        0x44,
        0x44,
        0x78,
        0x40,
        0x40,
        0x00, // 80: P
        0x00,
        0x38,
        0x44,
        0x44,
        0x54,
        0x48,
        0x34,
        0x00, // 81: Q
        0x00,
        0x78,
        0x44,
        0x44,
        0x78,
        0x48,
        0x44,
        0x00, // 82: R
        0x00,
        0x38,
        0x40,
        0x38,
        0x04,
        0x44,
        0x38,
        0x00, // 83: S
        0x00,
        0x7c,
        0x10,
        0x10,
        0x10,
        0x10,
        0x10,
        0x00, // 84: T
        0x00,
        0x44,
        0x44,
        0x44,
        0x44,
        0x44,
        0x38,
        0x00, // 85: U
        0x00,
        0x44,
        0x44,
        0x44,
        0x44,
        0x28,
        0x10,
        0x00, // 86: V
        0x00,
        0x44,
        0x44,
        0x44,
        0x54,
        0x6c,
        0x44,
        0x00, // 87: W
        0x00,
        0x44,
        0x28,
        0x10,
        0x28,
        0x44,
        0x44,
        0x00, // 88: X
        0x00,
        0x44,
        0x44,
        0x28,
        0x10,
        0x10,
        0x10,
        0x00, // 89: Y
        0x00,
        0x7c,
        0x08,
        0x10,
        0x20,
        0x40,
        0x7c,
        0x00, // 90: Z
        0x00,
        0x38,
        0x20,
        0x20,
        0x20,
        0x20,
        0x38,
        0x00, // 91: [
        0x00,
        0x00,
        0x40,
        0x20,
        0x10,
        0x08,
        0x04,
        0x00, // 92: \
        0x00,
        0x38,
        0x08,
        0x08,
        0x08,
        0x08,
        0x38,
        0x00, // 93: ]
        0x00,
        0x10,
        0x28,
        0x44,
        0x00,
        0x00,
        0x00,
        0x00, // 94: ^
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x7c,
        0x00, // 95: _
        0x00,
        0x20,
        0x10,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00, // 96: `
        0x00,
        0x00,
        0x38,
        0x04,
        0x3c,
        0x44,
        0x3c,
        0x00, // 97: a
        0x00,
        0x40,
        0x40,
        0x78,
        0x44,
        0x44,
        0x78,
        0x00, // 98: b
        0x00,
        0x00,
        0x38,
        0x44,
        0x40,
        0x44,
        0x38,
        0x00, // 99: c
        0x00,
        0x04,
        0x04,
        0x3c,
        0x44,
        0x44,
        0x3c,
        0x00, // 100: d
        0x00,
        0x00,
        0x38,
        0x44,
        0x7c,
        0x40,
        0x38,
        0x00, // 101: e
        0x00,
        0x18,
        0x20,
        0x78,
        0x20,
        0x20,
        0x20,
        0x00, // 102: f
        0x00,
        0x00,
        0x3c,
        0x44,
        0x44,
        0x3c,
        0x04,
        0x38, // 103: g
        0x00,
        0x40,
        0x40,
        0x78,
        0x44,
        0x44,
        0x44,
        0x00, // 104: h
        0x00,
        0x10,
        0x00,
        0x30,
        0x10,
        0x10,
        0x38,
        0x00, // 105: i
        0x00,
        0x08,
        0x00,
        0x08,
        0x08,
        0x08,
        0x48,
        0x30, // 106: j
        0x00,
        0x40,
        0x48,
        0x50,
        0x60,
        0x50,
        0x48,
        0x00, // 107: k
        0x00,
        0x30,
        0x10,
        0x10,
        0x10,
        0x10,
        0x38,
        0x00, // 108: l
        0x00,
        0x00,
        0x68,
        0x54,
        0x54,
        0x44,
        0x44,
        0x00, // 109: m
        0x00,
        0x00,
        0x78,
        0x44,
        0x44,
        0x44,
        0x44,
        0x00, // 110: n
        0x00,
        0x00,
        0x38,
        0x44,
        0x44,
        0x44,
        0x38,
        0x00, // 111: o
        0x00,
        0x00,
        0x78,
        0x44,
        0x44,
        0x78,
        0x40,
        0x40, // 112: p
        0x00,
        0x00,
        0x3c,
        0x44,
        0x44,
        0x3c,
        0x04,
        0x04, // 113: q
        0x00,
        0x00,
        0x58,
        0x64,
        0x40,
        0x40,
        0x40,
        0x00, // 114: r
        0x00,
        0x00,
        0x3c,
        0x40,
        0x38,
        0x04,
        0x78,
        0x00, // 115: s
        0x00,
        0x20,
        0x78,
        0x20,
        0x20,
        0x24,
        0x18,
        0x00, // 116: t
        0x00,
        0x00,
        0x44,
        0x44,
        0x44,
        0x4c,
        0x34,
        0x00, // 117: u
        0x00,
        0x00,
        0x44,
        0x44,
        0x44,
        0x28,
        0x10,
        0x00, // 118: v
        0x00,
        0x00,
        0x44,
        0x44,
        0x54,
        0x54,
        0x28,
        0x00, // 119: w
        0x00,
        0x00,
        0x44,
        0x28,
        0x10,
        0x28,
        0x44,
        0x00, // 120: x
        0x00,
        0x00,
        0x44,
        0x44,
        0x44,
        0x3c,
        0x04,
        0x38, // 121: y
        0x00,
        0x00,
        0x7c,
        0x08,
        0x10,
        0x20,
        0x7c,
        0x00, // 122: z
        0x00,
        0x08,
        0x10,
        0x20,
        0x10,
        0x08,
        0x00,
        0x00, // 123: {
        0x00,
        0x10,
        0x10,
        0x10,
        0x10,
        0x10,
        0x10,
        0x00, // 124: |
        0x00,
        0x20,
        0x10,
        0x08,
        0x10,
        0x20,
        0x00,
        0x00, // 125: }
        0x00,
        0x00,
        0x00,
        0x32,
        0x4c,
        0x00,
        0x00,
        0x00, // 126: ~
    ]);

    /**
     * Draw text using built-in font
     */
    private text(textPtr: number, x: number, y: number): void {
        if (!this.memory) return;
        const dc = this.getDrawColors();
        const textColor = dc & 0xf;
        const bgColor = (dc >> 4) & 0xf;

        const mem = new Uint8Array(this.memory.buffer);
        let cx = x;
        let cy = y;

        for (let i = textPtr; i < mem.length; i++) {
            const char = mem[i];
            if (!char) break;

            if (char === 10) {
                // Newline
                cx = x;
                cy += 8;
                continue;
            }

            if (char >= 32 && char <= 126) {
                const fontIndex = (char - 32) * 8;
                for (let row = 0; row < 8; row++) {
                    const fontByte = Wasm4Runtime.FONT[fontIndex + row] ?? 0;
                    for (let col = 0; col < 8; col++) {
                        const bit = (fontByte >> (7 - col)) & 1;
                        if (bit && textColor !== 0) {
                            this.setPixel(cx + col, cy + row, textColor);
                        } else if (!bit && bgColor !== 0) {
                            this.setPixel(cx + col, cy + row, bgColor);
                        }
                    }
                }
            }
            cx += 8;
        }
    }

    private textUtf8(textPtr: number, byteLength: number, x: number, y: number): void {
        // For now, treat as regular text (ASCII subset)
        void byteLength;
        this.text(textPtr, x, y);
    }

    private textUtf16(textPtr: number, byteLength: number, x: number, y: number): void {
        // Simplified - just render what we can
        void byteLength;
        void textPtr;
        void x;
        void y;
    }

    /**
     * Blit a sprite to the framebuffer
     */
    private blit(spritePtr: number, x: number, y: number, width: number, height: number, flags: number): void {
        this.blitSub(spritePtr, x, y, width, height, 0, 0, width, flags);
    }

    /**
     * Blit a sub-region of a sprite
     */
    private blitSub(
        spritePtr: number,
        x: number,
        y: number,
        width: number,
        height: number,
        srcX: number,
        srcY: number,
        stride: number,
        flags: number
    ): void {
        if (!this.memory) return;

        const mem = new Uint8Array(this.memory.buffer);
        const dc = this.getDrawColors();

        const bpp2 = (flags & 1) !== 0; // 2 bits per pixel if set, else 1bpp
        const flipX = (flags & 2) !== 0;
        const flipY = (flags & 4) !== 0;
        const rotate = (flags & 8) !== 0;

        for (let py = 0; py < height; py++) {
            const dy = flipY ? height - 1 - py : py;
            for (let px = 0; px < width; px++) {
                const dx = flipX ? width - 1 - px : px;

                let drawX = x + px;
                let drawY = y + py;
                if (rotate) {
                    const tmp = drawX;
                    drawX = drawY;
                    drawY = tmp;
                }

                const srcPx = srcX + dx;
                const srcPy = srcY + dy;

                let colorIndex: number;
                if (bpp2) {
                    // 2bpp: 4 pixels per byte
                    const bitIndex = srcPy * stride + srcPx;
                    const byteIndex = spritePtr + (bitIndex >> 2);
                    const shift = (3 - (bitIndex & 3)) * 2;
                    const byte = mem[byteIndex] ?? 0;
                    colorIndex = (byte >> shift) & 0x3;
                } else {
                    // 1bpp: 8 pixels per byte
                    const bitIndex = srcPy * stride + srcPx;
                    const byteIndex = spritePtr + (bitIndex >> 3);
                    const shift = 7 - (bitIndex & 7);
                    const byte = mem[byteIndex] ?? 0;
                    colorIndex = (byte >> shift) & 0x1;
                }

                // Map through draw colors
                const drawColor = (dc >> (colorIndex * 4)) & 0xf;
                if (drawColor !== 0) {
                    this.setPixel(drawX, drawY, drawColor);
                }
            }
        }
    }

    // Sound
    private tone(_frequency: number, _duration: number, _volume: number, _flags: number): void {
        // TODO: Implement sound synthesis
    }

    // Storage
    private diskr(_destPtr: number, _size: number): number {
        // TODO: Implement disk read
        return 0;
    }

    private diskw(_srcPtr: number, _size: number): number {
        // TODO: Implement disk write
        return 0;
    }

    // Debug
    private trace(strPtr: number): void {
        if (!this.memory) return;
        const mem = new Uint8Array(this.memory.buffer);
        let str = '';
        for (let i = strPtr; i < mem.length; i++) {
            const char = mem[i];
            if (!char) break;
            str += String.fromCharCode(char);
        }
        console.log('[WASM-4]', str);
    }

    private traceUtf8(strPtr: number, byteLength: number): void {
        if (!this.memory) return;
        const mem = new Uint8Array(this.memory.buffer);
        const bytes = mem.slice(strPtr, strPtr + byteLength);
        const str = new TextDecoder().decode(bytes);
        console.log('[WASM-4]', str);
    }

    private traceUtf16(strPtr: number, byteLength: number): void {
        if (!this.memory) return;
        const mem = new Uint8Array(this.memory.buffer);
        const bytes = mem.slice(strPtr, strPtr + byteLength);
        const str = new TextDecoder('utf-16le').decode(bytes);
        console.log('[WASM-4]', str);
    }

    private tracef(_fmtPtr: number, _stackPtr: number): void {
        // TODO: Implement formatted trace
        console.log('[WASM-4] tracef called');
    }
}

export default Wasm4Runtime;
