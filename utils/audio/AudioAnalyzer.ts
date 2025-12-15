/**
 * AudioAnalyzer (F092)
 *
 * Captures microphone input and provides smoothed frequency band data
 * for audio-reactive wallpapers.
 *
 * Features:
 * - Microphone capture via getUserMedia
 * - FFT analysis with Web Audio API
 * - 4 frequency bands: bass, lowMid, highMid, treble
 * - Exponential moving average smoothing
 * - Sensitivity/gain control
 * - Graceful permission handling
 */

/**
 * Frequency band ranges (Hz)
 */
const BAND_RANGES = {
    bass: { min: 20, max: 250 },
    lowMid: { min: 250, max: 1000 },
    highMid: { min: 1000, max: 4000 },
    treble: { min: 4000, max: 20000 },
};

/**
 * Default smoothing factor (0-1, higher = smoother)
 */
const DEFAULT_SMOOTHING = 0.8;

/**
 * Audio band data
 */
export interface AudioBands {
    bass: number; // 0-1 normalized
    lowMid: number; // 0-1 normalized
    highMid: number; // 0-1 normalized
    treble: number; // 0-1 normalized
    level: number; // Overall level 0-1
}

/**
 * AudioAnalyzer configuration
 */
export interface AudioAnalyzerConfig {
    /** Sensitivity/gain multiplier (default: 1.0) */
    sensitivity: number;
    /** Smoothing factor for EMA (0-1, default: 0.8) */
    smoothing: number;
    /** FFT size (power of 2, default: 2048) */
    fftSize: number;
}

/**
 * Analyzer state
 */
export type AnalyzerState = 'inactive' | 'requesting' | 'active' | 'denied' | 'error';

/**
 * State change callback
 */
export type StateChangeCallback = (state: AnalyzerState, error?: string) => void;

/**
 * AudioAnalyzer class for microphone input analysis
 */
export class AudioAnalyzer {
    private audioContext: AudioContext | null = null;
    private analyzerNode: AnalyserNode | null = null;
    private sourceNode: MediaStreamAudioSourceNode | null = null;
    private mediaStream: MediaStream | null = null;
    private frequencyData: Uint8Array | null = null;
    private animationFrameId: number | null = null;

    private config: AudioAnalyzerConfig;
    private state: AnalyzerState = 'inactive';
    private onStateChange: StateChangeCallback | null = null;

    // Smoothed band values
    private smoothedBands: AudioBands = {
        bass: 0,
        lowMid: 0,
        highMid: 0,
        treble: 0,
        level: 0,
    };

    /**
     * Create a new AudioAnalyzer
     */
    constructor(config: Partial<AudioAnalyzerConfig> = {}) {
        this.config = {
            sensitivity: config.sensitivity ?? 1.0,
            smoothing: config.smoothing ?? DEFAULT_SMOOTHING,
            fftSize: config.fftSize ?? 2048,
        };
    }

    /**
     * Get current state
     */
    getState(): AnalyzerState {
        return this.state;
    }

    /**
     * Set state change callback
     */
    setOnStateChange(callback: StateChangeCallback): void {
        this.onStateChange = callback;
    }

    /**
     * Update state and notify listeners
     */
    private setState(newState: AnalyzerState, error?: string): void {
        this.state = newState;
        this.onStateChange?.(newState, error);
    }

    /**
     * Check if microphone is available (without requesting permission)
     */
    static async isMicrophoneAvailable(): Promise<boolean> {
        if (!navigator.mediaDevices?.getUserMedia) {
            return false;
        }

        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.some(d => d.kind === 'audioinput');
        } catch {
            return false;
        }
    }

    /**
     * Start audio analysis
     * Requests microphone permission if not already granted
     */
    async start(): Promise<boolean> {
        if (this.state === 'active') {
            return true;
        }

        this.setState('requesting');

        try {
            // Request microphone access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                },
            });

            // Create audio context
            this.audioContext = new AudioContext();

            // Create analyzer node
            this.analyzerNode = this.audioContext.createAnalyser();
            this.analyzerNode.fftSize = this.config.fftSize;
            this.analyzerNode.smoothingTimeConstant = 0.3; // Hardware smoothing

            // Create frequency data buffer
            this.frequencyData = new Uint8Array(this.analyzerNode.frequencyBinCount);

            // Connect microphone to analyzer
            this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.sourceNode.connect(this.analyzerNode);

            // Start analysis loop
            this.analyze();

            this.setState('active');
            console.log('[AudioAnalyzer] Started successfully');
            return true;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';

            if (error instanceof DOMException && error.name === 'NotAllowedError') {
                this.setState('denied', 'Microphone permission denied');
            } else {
                this.setState('error', errorMsg);
            }

            console.error('[AudioAnalyzer] Failed to start:', errorMsg);
            return false;
        }
    }

    /**
     * Stop audio analysis and release resources
     */
    stop(): void {
        // Stop animation loop
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Disconnect nodes
        if (this.sourceNode) {
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }

        // Stop media stream tracks
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        // Close audio context
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.analyzerNode = null;
        this.frequencyData = null;

        // Reset smoothed values
        this.smoothedBands = {
            bass: 0,
            lowMid: 0,
            highMid: 0,
            treble: 0,
            level: 0,
        };

        this.setState('inactive');
        console.log('[AudioAnalyzer] Stopped');
    }

    /**
     * Update configuration
     */
    setConfig(config: Partial<AudioAnalyzerConfig>): void {
        this.config = { ...this.config, ...config };

        if (this.analyzerNode && config.fftSize) {
            this.analyzerNode.fftSize = config.fftSize;
            this.frequencyData = new Uint8Array(this.analyzerNode.frequencyBinCount);
        }
    }

    /**
     * Get current audio bands (smoothed)
     */
    getBands(): AudioBands {
        return { ...this.smoothedBands };
    }

    /**
     * Get bands as Float32Array for shader uniforms
     * Format: [bass, lowMid, highMid, treble]
     */
    getBandsAsArray(): Float32Array {
        return new Float32Array([
            this.smoothedBands.bass,
            this.smoothedBands.lowMid,
            this.smoothedBands.highMid,
            this.smoothedBands.treble,
        ]);
    }

    /**
     * Get overall audio level
     */
    getLevel(): number {
        return this.smoothedBands.level;
    }

    /**
     * Main analysis loop
     */
    private analyze(): void {
        if (!this.analyzerNode || !this.frequencyData || !this.audioContext) {
            return;
        }

        // Get frequency data
        this.analyzerNode.getByteFrequencyData(this.frequencyData);

        // Calculate band values
        const rawBands = this.calculateBands();

        // Apply sensitivity
        const sensitivity = this.config.sensitivity;
        rawBands.bass = Math.min(rawBands.bass * sensitivity, 1);
        rawBands.lowMid = Math.min(rawBands.lowMid * sensitivity, 1);
        rawBands.highMid = Math.min(rawBands.highMid * sensitivity, 1);
        rawBands.treble = Math.min(rawBands.treble * sensitivity, 1);
        rawBands.level = Math.min(rawBands.level * sensitivity, 1);

        // Apply exponential moving average smoothing
        const s = this.config.smoothing;
        this.smoothedBands.bass = s * this.smoothedBands.bass + (1 - s) * rawBands.bass;
        this.smoothedBands.lowMid = s * this.smoothedBands.lowMid + (1 - s) * rawBands.lowMid;
        this.smoothedBands.highMid = s * this.smoothedBands.highMid + (1 - s) * rawBands.highMid;
        this.smoothedBands.treble = s * this.smoothedBands.treble + (1 - s) * rawBands.treble;
        this.smoothedBands.level = s * this.smoothedBands.level + (1 - s) * rawBands.level;

        // Schedule next frame
        this.animationFrameId = requestAnimationFrame(() => this.analyze());
    }

    /**
     * Calculate raw band values from frequency data
     */
    private calculateBands(): AudioBands {
        const frequencyData = this.frequencyData;
        const audioContext = this.audioContext;
        if (!frequencyData || !audioContext) {
            return { bass: 0, lowMid: 0, highMid: 0, treble: 0, level: 0 };
        }

        const sampleRate = audioContext.sampleRate;
        const binCount = frequencyData.length;
        const nyquist = sampleRate / 2;
        const binWidth = nyquist / binCount;

        // Helper to get average energy in a frequency range
        const getAverageInRange = (minHz: number, maxHz: number): number => {
            const minBin = Math.floor(minHz / binWidth);
            const maxBin = Math.min(Math.ceil(maxHz / binWidth), binCount - 1);

            if (minBin >= maxBin) return 0;

            let sum = 0;
            let count = 0;
            for (let i = minBin; i <= maxBin; i++) {
                sum += frequencyData[i] ?? 0;
                count++;
            }

            // Normalize to 0-1 range (frequency data is 0-255)
            return count > 0 ? sum / count / 255 : 0;
        };

        // Calculate each band
        const bands: AudioBands = {
            bass: getAverageInRange(BAND_RANGES.bass.min, BAND_RANGES.bass.max),
            lowMid: getAverageInRange(BAND_RANGES.lowMid.min, BAND_RANGES.lowMid.max),
            highMid: getAverageInRange(BAND_RANGES.highMid.min, BAND_RANGES.highMid.max),
            treble: getAverageInRange(BAND_RANGES.treble.min, BAND_RANGES.treble.max),
            level: 0,
        };

        // Calculate overall level (weighted average with emphasis on bass/mid)
        bands.level = bands.bass * 0.4 + bands.lowMid * 0.3 + bands.highMid * 0.2 + bands.treble * 0.1;

        return bands;
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.stop();
        this.onStateChange = null;
    }
}

export default AudioAnalyzer;
