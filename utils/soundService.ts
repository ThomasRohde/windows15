/**
 * SoundService - OS-level sound management
 *
 * Provides system-wide sound playback with volume control and persistence.
 * Uses Web Audio API for precise control and better performance.
 *
 * @example
 * ```ts
 * const soundService = SoundService.getInstance();
 * await soundService.initialize();
 * soundService.play('notification');
 * soundService.setVolume(0.7);
 * ```
 */

import { storageService } from './storage';

const SOUND_SETTINGS_KEY = 'windows15.os.soundSettings';

export interface SoundSettings {
    /** Master volume level (0.0 to 1.0) */
    volume: number;
    /** Whether sounds are muted */
    muted: boolean;
}

export type SystemSound = 'notification' | 'error' | 'success' | 'click' | 'open' | 'close' | 'minimize';

/**
 * Sound definitions using data URIs for small sound effects
 * These are minimal beep sounds generated programmatically
 */
const SOUND_DATA: Record<
    SystemSound,
    // eslint-disable-next-line no-undef
    { frequency: number; duration: number; type?: OscillatorType }
> = {
    notification: { frequency: 800, duration: 0.15, type: 'sine' },
    error: { frequency: 300, duration: 0.2, type: 'sawtooth' },
    success: { frequency: 600, duration: 0.12, type: 'sine' },
    click: { frequency: 1000, duration: 0.05, type: 'sine' },
    open: { frequency: 600, duration: 0.08, type: 'sine' },
    close: { frequency: 500, duration: 0.08, type: 'sine' },
    minimize: { frequency: 400, duration: 0.06, type: 'sine' },
};

class SoundService {
    private static instance: SoundService | null = null;
    private audioContext: AudioContext | null = null;
    private settings: SoundSettings = {
        volume: 0.5,
        muted: false,
    };
    private isInitialized = false;

    private constructor() {
        // Private constructor for singleton
    }

    public static getInstance(): SoundService {
        if (!SoundService.instance) {
            SoundService.instance = new SoundService();
        }
        return SoundService.instance;
    }

    /**
     * Initialize the sound service and load settings
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Load persisted settings
            const savedSettings = await storageService.get<SoundSettings>(SOUND_SETTINGS_KEY);
            if (savedSettings) {
                this.settings = savedSettings;
            }

            // Create audio context on first user interaction
            // Note: Most browsers require user interaction before audio playback
            this.initializeAudioContext();

            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize SoundService:', error);
        }
    }

    /**
     * Initialize Web Audio API context
     */
    private initializeAudioContext(): void {
        if (!this.audioContext) {
            const AudioContextClass =
                (window as typeof window & { webkitAudioContext?: typeof AudioContext }).AudioContext ||
                (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (AudioContextClass) {
                this.audioContext = new AudioContextClass();
            }
        }
    }

    /**
     * Play a system sound
     */
    public play(sound: SystemSound): void {
        if (!this.isInitialized || this.settings.muted || this.settings.volume === 0) {
            return;
        }

        try {
            this.initializeAudioContext();

            if (!this.audioContext) {
                console.warn('AudioContext not available');
                return;
            }

            // Resume context if suspended (required by some browsers)
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            const soundDef = SOUND_DATA[sound];
            if (!soundDef) {
                console.warn(`Unknown sound: ${sound}`);
                return;
            }

            this.playTone(soundDef.frequency, soundDef.duration, soundDef.type || 'sine');
        } catch (error) {
            console.error(`Failed to play sound ${sound}:`, error);
        }
    }

    /**
     * Play a synthesized tone
     */
    // eslint-disable-next-line no-undef
    private playTone(frequency: number, duration: number, type: OscillatorType): void {
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

        // Apply volume with envelope
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(this.settings.volume * 0.3, now + 0.01); // Attack
        gainNode.gain.linearRampToValueAtTime(0, now + duration); // Release

        oscillator.start(now);
        oscillator.stop(now + duration);
    }

    /**
     * Set master volume level
     */
    public async setVolume(volume: number): Promise<void> {
        this.settings.volume = Math.max(0, Math.min(1, volume));
        await this.persistSettings();
    }

    /**
     * Get current volume level
     */
    public getVolume(): number {
        return this.settings.volume;
    }

    /**
     * Set mute state
     */
    public async setMuted(muted: boolean): Promise<void> {
        this.settings.muted = muted;
        await this.persistSettings();
    }

    /**
     * Get current mute state
     */
    public isMuted(): boolean {
        return this.settings.muted;
    }

    /**
     * Toggle mute state
     */
    public async toggleMute(): Promise<void> {
        await this.setMuted(!this.settings.muted);
    }

    /**
     * Get current settings
     */
    public getSettings(): SoundSettings {
        return { ...this.settings };
    }

    /**
     * Persist settings to storage
     */
    private async persistSettings(): Promise<void> {
        try {
            await storageService.set(SOUND_SETTINGS_KEY, this.settings);
        } catch (error) {
            console.error('Failed to persist sound settings:', error);
        }
    }

    /**
     * Stop all currently playing sounds
     */
    public stopAll(): void {
        if (this.audioContext) {
            // Close and recreate context to stop all sounds
            this.audioContext.close();
            this.audioContext = null;
            this.initializeAudioContext();
        }
    }
}

export const soundService = SoundService.getInstance();
