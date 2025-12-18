import React, { useState, useEffect } from 'react';
import { useOS } from '../context/OSContext';

interface BatteryManager {
    level: number;
    charging: boolean;
    addEventListener: (type: string, listener: () => void) => void;
}

export const SystemStatusWidget: React.FC = () => {
    const { windows, focusWindow } = useOS();

    // System Status state
    const [cpuUsage, setCpuUsage] = useState(25);
    const [memoryUsage, setMemoryUsage] = useState(45);
    const [networkStatus, setNetworkStatus] = useState(navigator.onLine);
    const [batteryInfo, setBatteryInfo] = useState<{ level: number; charging: boolean } | null>(null);
    const [storageInfo, setStorageInfo] = useState<{ used: number; quota: number } | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [cpuHistory, setCpuHistory] = useState<number[]>([25]);
    const [startTime] = useState(Date.now());

    // Simulated CPU/Memory metrics with realistic fluctuation
    useEffect(() => {
        const interval = setInterval(() => {
            setCpuUsage(prev => {
                // Realistic fluctuation: +/- 5-15%, with occasional spikes
                const shouldSpike = Math.random() < 0.1; // 10% chance of spike
                const delta = shouldSpike ? Math.random() * 30 : (Math.random() - 0.5) * 10;
                const newValue = Math.max(15, Math.min(85, prev + delta));
                return Math.round(newValue);
            });

            setMemoryUsage(prev => {
                // Memory changes more slowly and gradually
                const delta = (Math.random() - 0.5) * 3;
                const newValue = Math.max(30, Math.min(90, prev + delta));
                return Math.round(newValue);
            });
        }, 2000); // Update every 2 seconds

        return () => clearInterval(interval);
    }, []);

    // CPU history for sparkline
    useEffect(() => {
        setCpuHistory(prev => {
            const newHistory = [...prev, cpuUsage];
            return newHistory.slice(-30); // Keep last 30 data points
        });
    }, [cpuUsage]);

    // Network status monitoring
    useEffect(() => {
        const handleOnline = () => setNetworkStatus(true);
        const handleOffline = () => setNetworkStatus(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Battery status
    useEffect(() => {
        if ('getBattery' in navigator) {
            (navigator as typeof navigator & { getBattery(): Promise<BatteryManager> }).getBattery().then(battery => {
                const updateBattery = () => {
                    setBatteryInfo({
                        level: Math.round(battery.level * 100),
                        charging: battery.charging,
                    });
                };

                updateBattery();
                battery.addEventListener('levelchange', updateBattery);
                battery.addEventListener('chargingchange', updateBattery);
            });
        }
    }, []);

    // Storage quota
    useEffect(() => {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            navigator.storage.estimate().then(estimate => {
                setStorageInfo({
                    used: estimate.usage || 0,
                    quota: estimate.quota || 0,
                });
            });
        }
    }, []);

    // Helper functions
    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
    };

    const getUsageColor = (percentage: number) => {
        if (percentage >= 90) return 'bg-red-500';
        if (percentage >= 75) return 'bg-yellow-500';
        return 'bg-primary';
    };

    const getUptime = () => {
        const seconds = Math.floor((Date.now() - startTime) / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    const storagePercent = storageInfo ? Math.round((storageInfo.used / storageInfo.quota) * 100) : 0;

    return (
        <div className="p-4 glass-panel rounded-xl pointer-events-auto hover:bg-white/5 transition-colors cursor-default">
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-3 mb-3 hover:bg-white/5 rounded-lg -m-2 p-2 transition-colors"
            >
                <span className="material-symbols-outlined text-green-400">memory</span>
                <span className="text-sm font-medium text-white/90 flex-1 text-left">System Status</span>
                <span
                    className={`material-symbols-outlined text-white/40 text-sm transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                >
                    expand_more
                </span>
            </button>

            {/* Core metrics */}
            <div className="space-y-3 mb-4">
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-white/60">
                        <span>CPU</span>
                        <span className={cpuUsage >= 75 ? 'text-yellow-400' : cpuUsage >= 90 ? 'text-red-400' : ''}>
                            {cpuUsage}%
                        </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${getUsageColor(cpuUsage)} rounded-full transition-all duration-300`}
                            style={{ width: `${cpuUsage}%` }}
                        ></div>
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-white/60">
                        <span>Memory</span>
                        <span
                            className={memoryUsage >= 75 ? 'text-yellow-400' : memoryUsage >= 90 ? 'text-red-400' : ''}
                        >
                            {memoryUsage}%
                        </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${getUsageColor(memoryUsage)} rounded-full transition-all duration-300`}
                            style={{ width: `${memoryUsage}%` }}
                        ></div>
                    </div>
                </div>

                {/* Network status */}
                <div className="flex items-center gap-2 text-xs text-white/60">
                    <div className={`w-2 h-2 rounded-full ${networkStatus ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    <span>{networkStatus ? 'Online' : 'Offline'}</span>
                </div>
            </div>

            {/* Expanded details */}
            {isExpanded && (
                <div className="space-y-3 mb-4 border-t border-white/10 pt-3 animate-in slide-in-from-top-2 duration-200">
                    {/* CPU Sparkline */}
                    <div className="space-y-1">
                        <div className="text-[10px] text-white/40 uppercase tracking-wider">CPU History</div>
                        <div className="flex items-end gap-0.5 h-8">
                            {cpuHistory.map((value, i) => (
                                <div
                                    key={i}
                                    className={`flex-1 ${getUsageColor(value)} rounded-t transition-all`}
                                    style={{ height: `${value}%`, minWidth: '2px' }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Battery */}
                    {batteryInfo && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-white/60">
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs">
                                        {batteryInfo.charging ? 'battery_charging_full' : 'battery_std'}
                                    </span>
                                    Battery
                                </span>
                                <span>{batteryInfo.level}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${batteryInfo.level < 20 ? 'bg-red-500' : 'bg-green-500'} rounded-full`}
                                    style={{ width: `${batteryInfo.level}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    {/* Storage */}
                    {storageInfo && storageInfo.quota > 0 && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-white/60">
                                <span>Storage</span>
                                <span className={storagePercent >= 75 ? 'text-yellow-400' : ''}>
                                    {formatBytes(storageInfo.used)} / {formatBytes(storageInfo.quota)}
                                </span>
                            </div>
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${getUsageColor(storagePercent)} rounded-full`}
                                    style={{ width: `${storagePercent}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    {/* Uptime */}
                    <div className="flex justify-between text-xs text-white/60">
                        <span>Uptime</span>
                        <span>{getUptime()}</span>
                    </div>

                    {/* Performance API metrics */}
                    {window.performance && (
                        <div className="flex justify-between text-xs text-white/60">
                            <span>DOM Nodes</span>
                            <span>{document.getElementsByTagName('*').length}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Process List */}
            {windows.length > 0 && (
                <div className="border-t border-white/10 pt-3">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-white/40 uppercase tracking-wider">Processes</span>
                        <span className="text-[10px] text-white/40">{windows.length} running</span>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                        {windows
                            .slice()
                            .sort((a, b) => b.zIndex - a.zIndex)
                            .map(window => {
                                // Simulate CPU/memory usage (deterministic based on window ID)
                                const hashCode = window.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                const cpuUsageProcess = (hashCode % 15) + 2; // 2-16%
                                const memUsage = ((hashCode * 13) % 80) + 20; // 20-100 MB

                                return (
                                    <button
                                        key={window.id}
                                        type="button"
                                        onClick={() => focusWindow(window.id)}
                                        className="w-full flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-white/10 transition-colors text-left"
                                        title={`Focus ${window.title}`}
                                    >
                                        <span className="text-white/80 truncate flex-1 mr-2">{window.title}</span>
                                        <div className="flex gap-2 text-[10px] text-white/40 shrink-0">
                                            <span>{cpuUsageProcess}%</span>
                                            <span>{memUsage}MB</span>
                                        </div>
                                    </button>
                                );
                            })}
                    </div>
                </div>
            )}
        </div>
    );
};
