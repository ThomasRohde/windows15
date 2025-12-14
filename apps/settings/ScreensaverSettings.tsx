/**
 * ScreensaverSettings - UI panel for configuring screensaver
 *
 * Allows users to enable/disable screensaver, adjust idle timeout,
 * and select animation type. All settings persist to Dexie.
 */
import React, { useState } from 'react';
import { useScreensaver } from '../../context/ScreensaverContext';

export const ScreensaverSettings: React.FC = () => {
    const { settings, updateSettings, activateScreensaver } = useScreensaver();
    const [isSaving, setIsSaving] = useState(false);

    if (!settings) {
        return (
            <div className="max-w-2xl">
                <h1 className="text-3xl font-light mb-3">Screensaver</h1>
                <p className="text-sm text-white/60">Loading screensaver settings...</p>
            </div>
        );
    }

    const handleToggleEnabled = async () => {
        setIsSaving(true);
        await updateSettings({ enabled: !settings.enabled });
        setIsSaving(false);
    };

    const handleTimeoutChange = async (minutes: number) => {
        setIsSaving(true);
        await updateSettings({ timeout: minutes * 60 * 1000 });
        setIsSaving(false);
    };

    const handleAnimationChange = async (animation: 'starfield' | 'matrix' | 'bouncing-logo' | 'geometric') => {
        setIsSaving(true);
        await updateSettings({ animation });
        setIsSaving(false);
    };

    const handlePreview = () => {
        activateScreensaver();
    };

    const timeoutMinutes = Math.round(settings.timeout / 60000);

    return (
        <div className="max-w-2xl">
            <h1 className="text-3xl font-light mb-8">Screensaver</h1>

            {/* Enable/Disable Toggle */}
            <section className="mb-8">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div>
                        <h3 className="text-lg font-medium">Enable Screensaver</h3>
                        <p className="text-sm text-white/60">Automatically activate screensaver after idle timeout</p>
                    </div>
                    <button
                        onClick={handleToggleEnabled}
                        disabled={isSaving}
                        className={`relative w-14 h-8 rounded-full transition-colors ${settings.enabled ? 'bg-primary' : 'bg-white/20'} ${isSaving ? 'opacity-50' : ''}`}
                    >
                        <div
                            className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${settings.enabled ? 'translate-x-6' : ''}`}
                        />
                    </button>
                </div>
            </section>

            {/* Timeout Setting */}
            <section className="mb-8">
                <h3 className="text-lg font-medium mb-4">Idle Timeout</h3>
                <p className="text-sm text-white/60 mb-4">Time of inactivity before screensaver activates</p>
                <div className="flex items-center gap-4">
                    <input
                        type="range"
                        min="1"
                        max="30"
                        value={timeoutMinutes}
                        onChange={e => handleTimeoutChange(parseInt(e.target.value))}
                        disabled={!settings.enabled || isSaving}
                        className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50"
                    />
                    <span className="text-lg font-medium w-24 text-center">
                        {timeoutMinutes} {timeoutMinutes === 1 ? 'minute' : 'minutes'}
                    </span>
                </div>
            </section>

            {/* Animation Type Selection */}
            <section className="mb-8">
                <h3 className="text-lg font-medium mb-4">Animation Type</h3>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => handleAnimationChange('starfield')}
                        disabled={!settings.enabled || isSaving}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                            settings.animation === 'starfield'
                                ? 'border-primary bg-primary/10'
                                : 'border-white/10 hover:border-white/20'
                        } ${!settings.enabled || isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <span className="material-symbols-outlined text-2xl">star</span>
                            <h4 className="font-medium">Starfield</h4>
                        </div>
                        <p className="text-sm text-white/60">Flying through space with stars</p>
                    </button>

                    <button
                        onClick={() => handleAnimationChange('matrix')}
                        disabled={!settings.enabled || isSaving}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                            settings.animation === 'matrix'
                                ? 'border-primary bg-primary/10'
                                : 'border-white/10 hover:border-white/20'
                        } ${!settings.enabled || isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <span className="material-symbols-outlined text-2xl">code</span>
                            <h4 className="font-medium">Matrix Rain</h4>
                        </div>
                        <p className="text-sm text-white/60">Falling green characters</p>
                    </button>

                    <button
                        onClick={() => handleAnimationChange('bouncing-logo')}
                        disabled={!settings.enabled || isSaving}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                            settings.animation === 'bouncing-logo'
                                ? 'border-primary bg-primary/10'
                                : 'border-white/10 hover:border-white/20'
                        } ${!settings.enabled || isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <span className="material-symbols-outlined text-2xl">sports_soccer</span>
                            <h4 className="font-medium">Bouncing Logo</h4>
                        </div>
                        <p className="text-sm text-white/60">Colorful bouncing logo</p>
                    </button>

                    <button
                        onClick={() => handleAnimationChange('geometric')}
                        disabled={!settings.enabled || isSaving}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                            settings.animation === 'geometric'
                                ? 'border-primary bg-primary/10'
                                : 'border-white/10 hover:border-white/20'
                        } ${!settings.enabled || isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <span className="material-symbols-outlined text-2xl">shapes</span>
                            <h4 className="font-medium">Geometric</h4>
                        </div>
                        <p className="text-sm text-white/60">Rotating geometric patterns</p>
                    </button>
                </div>
            </section>

            {/* Preview Button */}
            <section className="mb-8">
                <button
                    onClick={handlePreview}
                    disabled={!settings.enabled || isSaving}
                    className="px-6 py-3 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    <span className="material-symbols-outlined">preview</span>
                    Preview Screensaver
                </button>
                <p className="text-sm text-white/60 mt-2">Click or press any key to exit the preview</p>
            </section>
        </div>
    );
};
