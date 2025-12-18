/**
 * SoundSettings - OS Sound Configuration
 *
 * Provides UI for controlling system sound volume and mute settings.
 */
import React, { useState, useEffect } from 'react';
import { Icon, Button, SectionLabel } from '../../components/ui';
import { soundService } from '../../utils/soundService';

export const SoundSettings: React.FC = () => {
    const [volume, setVolume] = useState(0.5);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        // Initialize sound service and load settings
        const initializeSettings = async () => {
            await soundService.initialize();
            setVolume(soundService.getVolume());
            setIsMuted(soundService.isMuted());
        };
        initializeSettings();
    }, []);

    const handleVolumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        await soundService.setVolume(newVolume);
    };

    const handleMuteToggle = async () => {
        const newMuted = !isMuted;
        setIsMuted(newMuted);
        await soundService.setMuted(newMuted);
    };

    const testSound = () => {
        soundService.play('notification');
    };

    const getVolumeIcon = () => {
        if (isMuted || volume === 0) return 'volume_off';
        if (volume < 0.3) return 'volume_mute';
        if (volume < 0.7) return 'volume_down';
        return 'volume_up';
    };

    const volumePercentage = Math.round(volume * 100);

    return (
        <div className="space-y-6">
            <div>
                <SectionLabel>System Volume</SectionLabel>
                <p className="text-sm text-white/60 mb-4">Control the volume of system sounds and notifications</p>

                {/* Volume Control */}
                <div className="bg-black/20 rounded-xl p-6 space-y-6">
                    <div className="flex items-center gap-4">
                        <Icon name={getVolumeIcon()} size="lg" className="text-white/80" />
                        <div className="flex-1">
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={handleVolumeChange}
                                disabled={isMuted}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
                                    [&::-webkit-slider-thumb]:appearance-none 
                                    [&::-webkit-slider-thumb]:w-4 
                                    [&::-webkit-slider-thumb]:h-4 
                                    [&::-webkit-slider-thumb]:rounded-full 
                                    [&::-webkit-slider-thumb]:bg-blue-500
                                    [&::-webkit-slider-thumb]:cursor-pointer
                                    [&::-webkit-slider-thumb]:transition-all
                                    [&::-webkit-slider-thumb]:hover:bg-blue-400
                                    [&::-webkit-slider-thumb]:hover:scale-110
                                    [&::-moz-range-thumb]:appearance-none 
                                    [&::-moz-range-thumb]:w-4 
                                    [&::-moz-range-thumb]:h-4 
                                    [&::-moz-range-thumb]:rounded-full 
                                    [&::-moz-range-thumb]:bg-blue-500
                                    [&::-moz-range-thumb]:cursor-pointer
                                    [&::-moz-range-thumb]:border-0
                                    [&::-moz-range-thumb]:transition-all
                                    [&::-moz-range-thumb]:hover:bg-blue-400
                                    [&::-moz-range-thumb]:hover:scale-110
                                    disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>
                        <span className="text-sm text-white/80 font-medium w-12 text-right">
                            {isMuted ? '0%' : `${volumePercentage}%`}
                        </span>
                    </div>

                    {/* Enable Toggle */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div>
                            <div className="text-sm font-medium text-white/90">Enable System Sounds</div>
                            <div className="text-xs text-white/50 mt-1">
                                Play sounds for system events and notifications
                            </div>
                        </div>
                        <button
                            onClick={handleMuteToggle}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                                ${!isMuted ? 'bg-blue-500' : 'bg-white/20'}`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                    ${!isMuted ? 'translate-x-6' : 'translate-x-1'}`}
                            />
                        </button>
                    </div>

                    {/* Test Sound Button */}
                    <div className="pt-4 border-t border-white/10">
                        <Button variant="secondary" size="sm" onClick={testSound} disabled={isMuted || volume === 0}>
                            <Icon name="notifications" size="sm" />
                            Test Sound
                        </Button>
                        <p className="text-xs text-white/40 mt-2">
                            Play a test notification sound to check your volume level
                        </p>
                    </div>
                </div>
            </div>

            {/* Sound Events */}
            <div>
                <SectionLabel>System Events</SectionLabel>
                <p className="text-sm text-white/60 mb-4">
                    Sounds are played for the following system events when enabled
                </p>

                <div className="bg-black/20 rounded-xl p-6 space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                        <Icon name="notifications" size="sm" className="text-blue-400" />
                        <span>Notifications</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <Icon name="error" size="sm" className="text-red-400" />
                        <span>Error messages</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <Icon name="check_circle" size="sm" className="text-green-400" />
                        <span>Success confirmations</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <Icon name="window" size="sm" className="text-purple-400" />
                        <span>Window actions (open, close, minimize)</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <Icon name="touch_app" size="sm" className="text-cyan-400" />
                        <span>UI interactions (clicks, selections)</span>
                    </div>
                </div>
            </div>

            {/* Audio Info */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <Icon name="info" className="text-blue-400 mt-0.5" />
                    <div className="text-sm">
                        <p className="text-white/90 font-medium mb-1">Browser Audio Permissions</p>
                        <p className="text-white/60">
                            System sounds use the Web Audio API. Your browser may require user interaction before
                            allowing audio playback. Sound settings are saved and persist across sessions.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
