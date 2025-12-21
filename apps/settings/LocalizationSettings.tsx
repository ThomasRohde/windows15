import React, { useEffect, useMemo, useState } from 'react';
import { useLocalization } from '@/context';
import type { ClockFormatPreference, UnitSystemPreference } from '@/utils/localization';
import { formatSpeed, formatTemperature } from '@/utils/localization';

export const LocalizationSettings = () => {
    const {
        preferences,
        setUnitSystemPreference,
        setClockFormatPreference,
        unitSystem,
        clockFormat,
        formatTimeShort,
        formatDateLong,
    } = useLocalization();

    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const temperaturePreview = useMemo(() => formatTemperature(21, unitSystem), [unitSystem]);
    const speedPreview = useMemo(() => formatSpeed(10, unitSystem), [unitSystem]);

    return (
        <div className="max-w-2xl space-y-6 md:space-y-8">
            <div>
                <h1 className="text-2xl md:text-3xl font-light mb-2 md:mb-3">Time &amp; language</h1>
                <p className="text-sm text-white/60">Change how Windows15 displays time and measurement units.</p>
            </div>

            <div className="glass-panel rounded-xl p-4 md:p-5 space-y-4">
                <div className="text-sm font-medium text-white/90">Clock</div>
                <label className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
                    <span className="text-sm text-white/80">Time format</span>
                    <select
                        value={preferences.clockFormat}
                        onChange={e => setClockFormatPreference(e.target.value as ClockFormatPreference)}
                        className="min-h-[44px] px-3 rounded-lg bg-black/30 border border-white/10 text-sm text-white/80 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                    >
                        <option value="system">System default ({clockFormat === '24h' ? '24-hour' : '12-hour'})</option>
                        <option value="24h">24-hour</option>
                        <option value="12h">12-hour</option>
                    </select>
                </label>
                <div className="text-xs text-white/50">Preview: {formatTimeShort(now)}</div>
            </div>

            <div className="glass-panel rounded-xl p-4 md:p-5 space-y-4">
                <div className="text-sm font-medium text-white/90">Measurement</div>
                <label className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
                    <span className="text-sm text-white/80">Unit system</span>
                    <select
                        value={preferences.unitSystem}
                        onChange={e => setUnitSystemPreference(e.target.value as UnitSystemPreference)}
                        className="min-h-[44px] px-3 rounded-lg bg-black/30 border border-white/10 text-sm text-white/80 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                    >
                        <option value="system">
                            System default ({unitSystem === 'imperial' ? 'Imperial' : 'Metric'})
                        </option>
                        <option value="metric">Metric (°C, km/h)</option>
                        <option value="imperial">Imperial (°F, mph)</option>
                    </select>
                </label>
                <div className="text-xs text-white/50">
                    Preview: {temperaturePreview.value}
                    {temperaturePreview.unit}, {speedPreview.value} {speedPreview.unit}
                </div>
            </div>

            <div className="glass-panel rounded-xl p-4 md:p-5 space-y-2">
                <div className="text-sm font-medium text-white/90">Example</div>
                <div className="flex items-center justify-between gap-4 md:gap-6">
                    <div className="min-w-0">
                        <div className="text-xs text-white/50">Date</div>
                        <div className="text-sm text-white/80 truncate">{formatDateLong(now)}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-white/50">Time</div>
                        <div className="text-xl md:text-2xl font-light text-white">{formatTimeShort(now)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
