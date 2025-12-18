/**
 * WindowSpaceSettings (F107, F108)
 *
 * Settings panel for 3D Window Space mode.
 * Controls:
 * - Enable/disable 3D mode
 * - Depth intensity (0-1)
 * - Perspective (field of view)
 * - Tilt on drag toggle
 * - Motion preference
 */
import React from 'react';
import { useWindowSpace } from '../../context';
import { Slider } from '../../components/ui';

export const WindowSpaceSettings: React.FC = () => {
    const { settings, is3DMode, toggle3DMode, updateSettings, prefersReducedMotion } = useWindowSpace();

    return (
        <div className="max-w-2xl">
            <h1 className="text-3xl font-light mb-3">3D Window Space</h1>
            <p className="text-sm text-white/60 mb-8">
                Enable a 3D perspective effect for windows. Windows will appear at different depths based on their
                stacking order.
            </p>

            {/* System reduced motion warning */}
            {prefersReducedMotion && (
                <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                    <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-yellow-400">warning</span>
                        <div>
                            <p className="text-sm text-yellow-200 font-medium">Reduced motion preference detected</p>
                            <p className="text-xs text-yellow-200/70 mt-1">
                                Your system is set to prefer reduced motion. 3D effects are disabled to respect this
                                preference.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                {/* 3D Mode Toggle */}
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div>
                        <h3 className="text-base font-medium text-white">Enable 3D Mode</h3>
                        <p className="text-sm text-white/60">Apply depth and perspective effects to windows</p>
                    </div>
                    <button
                        type="button"
                        onClick={toggle3DMode}
                        disabled={prefersReducedMotion}
                        className={`w-14 h-8 rounded-full transition-colors relative ${
                            is3DMode ? 'bg-primary' : 'bg-white/20'
                        } ${prefersReducedMotion ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div
                            className={`w-6 h-6 rounded-full bg-white shadow absolute top-1 transition-transform ${
                                is3DMode ? 'translate-x-7' : 'translate-x-1'
                            }`}
                        />
                    </button>
                </div>

                {/* Depth Intensity (F107) */}
                <div className="p-4 bg-white/5 rounded-xl space-y-3">
                    <div className="mb-2">
                        <h3 className="text-base font-medium text-white">Depth Intensity</h3>
                        <p className="text-sm text-white/60">Controls how far windows appear separated in depth</p>
                    </div>
                    <Slider
                        value={Math.round(settings.depthIntensity * 100)}
                        min={0}
                        max={100}
                        onChange={v => updateSettings({ depthIntensity: v / 100 })}
                        formatValue={v => `${v}%`}
                        rangeLabels={['Subtle', 'Dramatic']}
                        disabled={!is3DMode}
                    />
                </div>

                {/* Perspective (F108) */}
                <div className="p-4 bg-white/5 rounded-xl space-y-3">
                    <div className="mb-2">
                        <h3 className="text-base font-medium text-white">Perspective</h3>
                        <p className="text-sm text-white/60">Adjust the field of view (lower = more dramatic)</p>
                    </div>
                    <Slider
                        value={settings.perspective}
                        min={500}
                        max={2000}
                        step={100}
                        onChange={v => updateSettings({ perspective: v })}
                        formatValue={v => `${v}px`}
                        rangeLabels={['Dramatic (500px)', 'Subtle (2000px)']}
                        disabled={!is3DMode}
                    />
                </div>

                {/* Tilt on Drag */}
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div>
                        <h3 className="text-base font-medium text-white">Tilt on Drag</h3>
                        <p className="text-sm text-white/60">Windows tilt slightly when being dragged</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => updateSettings({ tiltOnDrag: !settings.tiltOnDrag })}
                        disabled={!is3DMode}
                        className={`w-14 h-8 rounded-full transition-colors relative ${
                            settings.tiltOnDrag && is3DMode ? 'bg-primary' : 'bg-white/20'
                        } ${!is3DMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div
                            className={`w-6 h-6 rounded-full bg-white shadow absolute top-1 transition-transform ${
                                settings.tiltOnDrag && is3DMode ? 'translate-x-7' : 'translate-x-1'
                            }`}
                        />
                    </button>
                </div>

                {/* Motion Override */}
                <div className="p-4 bg-white/5 rounded-xl space-y-3">
                    <div>
                        <h3 className="text-base font-medium text-white">Motion Preference</h3>
                        <p className="text-sm text-white/60">Override system reduced motion preference</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => updateSettings({ motion: 'full' })}
                            className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                                settings.motion === 'full'
                                    ? 'bg-primary text-white'
                                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                            }`}
                        >
                            Full Motion
                        </button>
                        <button
                            type="button"
                            onClick={() => updateSettings({ motion: 'reduced' })}
                            className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                                settings.motion === 'reduced'
                                    ? 'bg-primary text-white'
                                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                            }`}
                        >
                            Reduced Motion
                        </button>
                    </div>
                </div>

                {/* Keyboard Shortcut Info */}
                <div className="p-4 bg-white/5 rounded-xl">
                    <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-primary">keyboard</span>
                        <div>
                            <p className="text-sm text-white/80 font-medium">Keyboard Shortcut</p>
                            <p className="text-sm text-white/60 mt-1">
                                Press <kbd className="px-2 py-0.5 bg-white/10 rounded text-xs font-mono">Ctrl</kbd> +{' '}
                                <kbd className="px-2 py-0.5 bg-white/10 rounded text-xs font-mono">Alt</kbd> +{' '}
                                <kbd className="px-2 py-0.5 bg-white/10 rounded text-xs font-mono">3</kbd> to quickly
                                toggle 3D mode.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WindowSpaceSettings;
