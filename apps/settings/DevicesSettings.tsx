import React, { useState, useCallback } from 'react';
import { useHandoff } from '../../hooks';
import { FormField, Select, Button, Icon } from '../../components/ui';

/**
 * DevicesSettings - Device profile and Handoff settings panel (F195)
 */
export const DevicesSettings: React.FC = () => {
    const {
        deviceId,
        deviceLabel,
        deviceCategory,
        setDeviceLabel,
        setDeviceCategory,
        retentionDays,
        setRetentionDays,
        clearArchived,
    } = useHandoff();
    const [label, setLabel] = useState(deviceLabel);
    const [category, setCategory] = useState(deviceCategory);
    const [retention, setRetention] = useState(retentionDays);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            setDeviceLabel(label);
            setDeviceCategory(category);
            setRetentionDays(retention);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        } finally {
            setIsSaving(false);
        }
    }, [label, category, retention, setDeviceLabel, setDeviceCategory, setRetentionDays]);

    const handleClearArchived = async () => {
        if (confirm('Are you sure you want to permanently delete all archived items?')) {
            await clearArchived();
        }
    };

    const hasChanges = label !== deviceLabel || category !== deviceCategory || retention !== retentionDays;

    return (
        <div className="max-w-2xl">
            <h1 className="text-3xl font-light mb-8">Devices</h1>

            <div className="bg-white/5 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 rounded-full bg-indigo-500/20 text-indigo-400">
                        <Icon name="devices" size={32} />
                    </div>
                    <div>
                        <h2 className="text-lg font-medium text-white">This Device</h2>
                        <p className="text-xs text-white/40 font-mono">ID: {deviceId}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <FormField label="Device Label" id="device-label" description="How this device appears to others">
                        <div className="flex gap-3">
                            <input
                                id="device-label"
                                type="text"
                                value={label}
                                onChange={e => setLabel(e.target.value)}
                                placeholder="e.g. Work Laptop, Home PC"
                                className="flex-1 h-10 px-4 bg-black/30 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent"
                            />
                            <div className="flex gap-1">
                                {['Work', 'Private', 'Home'].map(preset => (
                                    <button
                                        key={preset}
                                        onClick={() => setLabel(preset)}
                                        className="px-2 py-1 text-[10px] bg-white/5 hover:bg-white/10 rounded border border-white/10 text-white/60 transition-colors"
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </FormField>

                    <FormField
                        label="Device Category"
                        id="device-category"
                        description="Used for targeting Handoff items"
                    >
                        <Select
                            id="device-category"
                            value={category}
                            onChange={e => setCategory(e.target.value as 'any' | 'work' | 'private')}
                            options={[
                                { label: 'Any / General', value: 'any' },
                                { label: 'Work', value: 'work' },
                                { label: 'Private', value: 'private' },
                            ]}
                            className="w-full bg-black/30 border-white/10"
                        />
                    </FormField>

                    <FormField
                        label="Auto-Archive Period"
                        id="retention-period"
                        description="Items older than this will be moved to Archive"
                    >
                        <Select
                            id="retention-period"
                            value={retention.toString()}
                            onChange={e => setRetention(parseInt(e.target.value))}
                            options={[
                                { label: '1 Day', value: '1' },
                                { label: '3 Days', value: '3' },
                                { label: '7 Days (Default)', value: '7' },
                                { label: '14 Days', value: '14' },
                                { label: '30 Days', value: '30' },
                            ]}
                            className="w-full bg-black/30 border-white/10"
                        />
                    </FormField>

                    <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                        <Button
                            variant="ghost"
                            onClick={handleClearArchived}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                            <div className="flex items-center gap-2">
                                <Icon name="delete_sweep" size={18} />
                                Clear Archive
                            </div>
                        </Button>

                        <Button
                            variant="primary"
                            onClick={handleSave}
                            disabled={!hasChanges || isSaving || !label.trim()}
                            className="bg-indigo-600 hover:bg-indigo-500"
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

            <div className="bg-white/5 rounded-xl p-6">
                <h3 className="text-sm font-medium text-white/80 mb-3 flex items-center gap-2">
                    <Icon name="info" size={18} />
                    About Device Profiles
                </h3>
                <p className="text-xs text-white/60 leading-relaxed">
                    Device profiles help you organize your Handoff Queue. You can target specific categories of devices
                    when sending links or text, ensuring your work content stays on work devices and private content
                    stays on private devices.
                </p>
            </div>
        </div>
    );
};
