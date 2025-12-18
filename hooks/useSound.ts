/**
 * useSound - Hook for playing system sounds
 *
 * Provides a convenient way to play system sounds with automatic
 * respect for user mute/volume settings.
 *
 * @module hooks/useSound
 *
 * @example
 * ```tsx
 * const { playSound, isEnabled, volume } = useSound();
 *
 * // Play a success sound
 * playSound('success');
 *
 * // Play with callback
 * const handleSave = async () => {
 *   await saveData();
 *   playSound('success');
 * };
 *
 * // Conditionally play based on settings
 * if (isEnabled) {
 *   playSound('notification');
 * }
 * ```
 */
import { useCallback, useEffect, useState } from 'react';
import { soundService, SystemSound, SoundSettings } from '../utils/soundService';

export type { SystemSound };

interface UseSoundResult {
    /**
     * Play a system sound
     * @param sound - The sound type to play
     */
    playSound: (sound: SystemSound) => void;
    /**
     * Whether sounds are enabled (not muted and volume > 0)
     */
    isEnabled: boolean;
    /**
     * Whether sounds are muted
     */
    isMuted: boolean;
    /**
     * Current volume level (0.0 to 1.0)
     */
    volume: number;
    /**
     * Set the volume level
     */
    setVolume: (volume: number) => Promise<void>;
    /**
     * Toggle mute state
     */
    toggleMute: () => Promise<void>;
    /**
     * Set mute state
     */
    setMuted: (muted: boolean) => Promise<void>;
}

/**
 * Hook for playing system sounds
 *
 * This hook initializes the sound service on first use and provides
 * methods to play sounds and control volume/mute settings.
 *
 * @returns Sound playback methods and state
 */
export const useSound = (): UseSoundResult => {
    const [settings, setSettings] = useState<SoundSettings>({
        volume: 0.5,
        muted: false,
    });

    useEffect(() => {
        // Initialize sound service
        const init = async () => {
            await soundService.initialize();
            setSettings(soundService.getSettings());
        };
        init();
    }, []);

    const playSound = useCallback((sound: SystemSound) => {
        soundService.play(sound);
    }, []);

    const setVolume = useCallback(async (volume: number) => {
        await soundService.setVolume(volume);
        setSettings(soundService.getSettings());
    }, []);

    const setMuted = useCallback(async (muted: boolean) => {
        await soundService.setMuted(muted);
        setSettings(soundService.getSettings());
    }, []);

    const toggleMute = useCallback(async () => {
        await soundService.toggleMute();
        setSettings(soundService.getSettings());
    }, []);

    return {
        playSound,
        isEnabled: !settings.muted && settings.volume > 0,
        isMuted: settings.muted,
        volume: settings.volume,
        setVolume,
        setMuted,
        toggleMute,
    };
};
