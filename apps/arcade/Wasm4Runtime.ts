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
        return {
            env: {
                memory: this.memory!,
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
        if (!this.ctx || !this.imageData || !this.memory) return;

        const palette = this.getPalette();
        const mem = new Uint8Array(this.memory.buffer);
        const data = this.imageData.data;

        // Convert 2bpp framebuffer to RGBA
        for (let i = 0; i < SCREEN_WIDTH * SCREEN_HEIGHT; i++) {
            const byteIndex = FRAMEBUFFER + (i >> 2);
            const bitOffset = (i & 3) * 2;
            const colorIndex = (mem[byteIndex]! >> bitOffset) & 0x3;
            const color = palette[colorIndex]!;

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

    // Drawing functions (simplified implementations)
    private blit(_sprite: number, _x: number, _y: number, _width: number, _height: number, _flags: number): void {
        // TODO: Implement sprite blitting
    }

    private blitSub(
        _sprite: number,
        _x: number,
        _y: number,
        _width: number,
        _height: number,
        _srcX: number,
        _srcY: number,
        _stride: number,
        _flags: number
    ): void {
        // TODO: Implement sub-region sprite blitting
    }

    private line(_x1: number, _y1: number, _x2: number, _y2: number): void {
        // TODO: Implement line drawing
    }

    private hline(_x: number, _y: number, _len: number): void {
        // TODO: Implement horizontal line
    }

    private vline(_x: number, _y: number, _len: number): void {
        // TODO: Implement vertical line
    }

    private oval(_x: number, _y: number, _width: number, _height: number): void {
        // TODO: Implement oval drawing
    }

    private rect(_x: number, _y: number, _width: number, _height: number): void {
        // TODO: Implement rectangle drawing
    }

    private text(_textPtr: number, _x: number, _y: number): void {
        // TODO: Implement text rendering
    }

    private textUtf8(_textPtr: number, _byteLength: number, _x: number, _y: number): void {
        // TODO: Implement UTF-8 text rendering
    }

    private textUtf16(_textPtr: number, _byteLength: number, _x: number, _y: number): void {
        // TODO: Implement UTF-16 text rendering
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
        for (let i = strPtr; mem[i] !== 0 && i < mem.length; i++) {
            str += String.fromCharCode(mem[i]!);
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
