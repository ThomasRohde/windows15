import React, { useState, useCallback } from 'react';
import { FormField, Select, Button, Icon, Slider } from '../../components/ui';
import { useDb } from '../../context';
import { useDexieLiveQuery } from '../../utils/storage/react';
import { useTouchDevice } from '../../hooks';

interface TouchConfig {
    enabled: boolean;
    tabletMode: boolean;
    swipeGestures: boolean;
    pinchToResize: boolean;
    longPressDuration: number;
    snapZones: boolean;
    gestureSensitivity: number;
}

/**
 * TouchSettings - Touch and Tablet configuration panel (F216)
 */
const DEFAULT_CONFIG: TouchConfig = {
    enabled: true,
    tabletMode: false,
    swipeGestures: true,
    pinchToResize: true,
    longPressDuration: 500,
    snapZones: true,
    gestureSensitivity: 50,
};

export const TouchSettings: React.FC = () => {
    const { db } = useDb();
    const isTouchDevice = useTouchDevice();

    const { value: touchConfig } = useDexieLiveQuery<TouchConfig>(
        () => db.config.get('touch').then(result => (result?.value as TouchConfig) || DEFAULT_CONFIG),
        []
    );

    const config = touchConfig || DEFAULT_CONFIG;

    const [enabled, setEnabled] = useState(config.enabled);
    const [tabletMode, setTabletMode] = useState(config.tabletMode);
    const [swipeGestures, setSwipeGestures] = useState(config.swipeGestures);
    const [pinchToResize, setPinchToResize] = useState(config.pinchToResize);
    const [longPressDuration, setLongPressDuration] = useState(config.longPressDuration);
    const [snapZones, setSnapZones] = useState(config.snapZones);
    const [gestureSensitivity, setGestureSensitivity] = useState(config.gestureSensitivity);

    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            const newConfig: TouchConfig = {
                enabled,
                tabletMode,
                swipeGestures,
                pinchToResize,
                longPressDuration,
                snapZones,
                gestureSensitivity,
            };

            await db.config.put({
                key: 'touch',
                value: newConfig,
            });

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        } finally {
            setIsSaving(false);
        }
    }, [enabled, tabletMode, swipeGestures, pinchToResize, longPressDuration, snapZones, gestureSensitivity, db]);

    const hasChanges =
        enabled !== config.enabled ||
        tabletMode !== config.tabletMode ||
        swipeGestures !== config.swipeGestures ||
        pinchToResize !== config.pinchToResize ||
        longPressDuration !== config.longPressDuration ||
        snapZones !== config.snapZones ||
        gestureSensitivity !== config.gestureSensitivity;

    return (
        <div className="max-w-2xl">
            <h1 className="text-2xl md:text-3xl font-light mb-6 md:mb-8">Touch & Tablet</h1>

            <div className="bg-white/5 rounded-xl p-4 md:p-6 mb-4 md:mb-6">
                <div className="flex items-center gap-4 mb-4 md:mb-6">
                    <div className="p-3 rounded-full bg-blue-500/20 text-blue-400">
                        <Icon name="touch_app" size={32} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-base md:text-lg font-medium text-white">Touch Settings</h2>
                        <p className="text-xs md:text-sm text-white/60">
                            {isTouchDevice
                                ? 'Touch device detected - optimize for touch input'
                                : 'Configure touch behavior for tablet devices'}
                        </p>
                    </div>
                </div>

                <div className="space-y-4 md:space-y-6">
                    {/* Touch Enabled Toggle */}
                    <FormField
                        label="Enable Touch Features"
                        id="touch-enabled"
                        description="Enable touch-optimized UI and gestures throughout the system"
                    >
                        <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                            <input
                                type="checkbox"
                                checked={enabled}
                                onChange={e => setEnabled(e.target.checked)}
                                className="w-6 h-6 rounded bg-black/30 border border-white/10 checked:bg-blue-500 checked:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
                            />
                            <span className="text-sm text-white/80">
                                {enabled ? 'Touch features enabled' : 'Touch features disabled'}
                            </span>
                        </label>
                    </FormField>

                    {/* Tablet Mode */}
                    <FormField
                        label="Tablet Mode"
                        id="tablet-mode"
                        description="Optimize interface for full-time tablet use with larger touch targets"
                    >
                        <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                            <input
                                type="checkbox"
                                checked={tabletMode}
                                onChange={e => setTabletMode(e.target.checked)}
                                disabled={!enabled}
                                className="w-6 h-6 rounded bg-black/30 border border-white/10 checked:bg-blue-500 checked:border-blue-500 focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
                            />
                            <span className="text-sm text-white/80">
                                {tabletMode ? 'Tablet mode active' : 'Desktop mode'}
                            </span>
                        </label>
                    </FormField>

                    {/* Gesture Settings */}
                    <div className="pt-4 border-t border-white/5">
                        <h3 className="text-sm font-medium text-white/90 mb-4">Gesture Controls</h3>

                        <div className="space-y-3 md:space-y-4">
                            <FormField
                                label="Swipe Gestures"
                                id="swipe-gestures"
                                description="Edge swipes to open notification center"
                            >
                                <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                                    <input
                                        type="checkbox"
                                        checked={swipeGestures}
                                        onChange={e => setSwipeGestures(e.target.checked)}
                                        disabled={!enabled}
                                        className="w-6 h-6 rounded bg-black/30 border border-white/10 checked:bg-blue-500 checked:border-blue-500 focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
                                    />
                                    <span className="text-sm text-white/80">
                                        {swipeGestures ? 'Enabled' : 'Disabled'}
                                    </span>
                                </label>
                            </FormField>

                            <FormField
                                label="Pinch to Resize"
                                id="pinch-resize"
                                description="Pinch gestures to resize windows"
                            >
                                <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                                    <input
                                        type="checkbox"
                                        checked={pinchToResize}
                                        onChange={e => setPinchToResize(e.target.checked)}
                                        disabled={!enabled}
                                        className="w-6 h-6 rounded bg-black/30 border border-white/10 checked:bg-blue-500 checked:border-blue-500 focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
                                    />
                                    <span className="text-sm text-white/80">
                                        {pinchToResize ? 'Enabled' : 'Disabled'}
                                    </span>
                                </label>
                            </FormField>

                            <FormField
                                label="Snap Zones"
                                id="snap-zones"
                                description="Show snap zones when dragging windows near screen edges"
                            >
                                <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                                    <input
                                        type="checkbox"
                                        checked={snapZones}
                                        onChange={e => setSnapZones(e.target.checked)}
                                        disabled={!enabled}
                                        className="w-6 h-6 rounded bg-black/30 border border-white/10 checked:bg-blue-500 checked:border-blue-500 focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
                                    />
                                    <span className="text-sm text-white/80">{snapZones ? 'Enabled' : 'Disabled'}</span>
                                </label>
                            </FormField>
                        </div>
                    </div>

                    {/* Advanced Settings */}
                    <div className="pt-4 border-t border-white/5">
                        <h3 className="text-sm font-medium text-white/90 mb-4">Advanced Settings</h3>

                        <div className="space-y-6">
                            <FormField
                                label="Long Press Duration"
                                id="long-press-duration"
                                description="Time to hold before triggering context menu"
                            >
                                <Select
                                    id="long-press-duration"
                                    value={longPressDuration.toString()}
                                    onChange={val => setLongPressDuration(parseInt(val))}
                                    disabled={!enabled}
                                    options={[
                                        { label: '300ms (Fast)', value: '300' },
                                        { label: '500ms (Normal)', value: '500' },
                                        { label: '700ms (Slow)', value: '700' },
                                        { label: '1000ms (Very Slow)', value: '1000' },
                                    ]}
                                    className="w-full bg-black/30 border-white/10"
                                />
                            </FormField>

                            <FormField
                                label="Gesture Sensitivity"
                                id="gesture-sensitivity"
                                description="Adjust how responsive gestures are to touch input"
                            >
                                <div className="space-y-2">
                                    <Slider
                                        value={gestureSensitivity}
                                        onChange={setGestureSensitivity}
                                        min={0}
                                        max={100}
                                        step={10}
                                        disabled={!enabled}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-white/50">
                                        <span>Less sensitive</span>
                                        <span>{gestureSensitivity}%</span>
                                        <span>More sensitive</span>
                                    </div>
                                </div>
                            </FormField>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex justify-end">
                        <Button
                            variant="primary"
                            size="md"
                            onClick={handleSave}
                            disabled={!hasChanges || isSaving}
                            className="bg-blue-600 hover:bg-blue-500"
                        >
                            {isSaving ? (
                                <Icon name="progress_activity" className="animate-spin" />
                            ) : showSuccess ? (
                                <div className="flex items-center gap-2">
                                    <Icon name="check" />
                                    Saved
                                </div>
                            ) : (
                                'Save Changes'
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 md:p-6">
                <h3 className="text-sm font-medium text-white/80 mb-3 flex items-center gap-2">
                    <Icon name="info" size={18} />
                    About Touch Settings
                </h3>
                <p className="text-xs text-white/60 leading-relaxed">
                    These settings allow you to customize the touch behavior of Windows 15. Changes take effect
                    immediately and are saved per-device. For the best experience on tablets, enable Tablet Mode which
                    increases touch target sizes and optimizes the interface for touch-first interaction.
                </p>
            </div>
        </div>
    );
};
