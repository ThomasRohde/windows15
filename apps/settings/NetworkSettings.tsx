/**
 * NetworkSettings - Settings panel for network status (F163)
 *
 * Displays connection status, IP address, connection type,
 * latency, and other network metrics from NetworkContext.
 */
import React from 'react';
import { useNetwork } from '../../context';
import { Icon, Button } from '../../components/ui';
import { StatCard } from '../../components/ui/StatCard';

export const NetworkSettings: React.FC = () => {
    const {
        isOnline,
        effectiveType,
        ip,
        latency,
        isMeasuringLatency,
        downlink,
        rtt,
        saveData,
        refresh,
        measureLatency,
    } = useNetwork();

    const connectionTypeLabels: Record<string, string> = {
        '4g': '4G / LTE',
        '3g': '3G',
        '2g': '2G',
        'slow-2g': 'Slow 2G',
        unknown: 'Unknown',
    };

    const formatLatency = (ms: number | null): string => {
        if (ms === null) return 'N/A';
        if (ms < 50) return `${ms}ms (Excellent)`;
        if (ms < 100) return `${ms}ms (Good)`;
        if (ms < 200) return `${ms}ms (Fair)`;
        return `${ms}ms (Poor)`;
    };

    const formatDownlink = (mbps: number | null): string => {
        if (mbps === null) return 'N/A';
        if (mbps >= 10) return `${mbps.toFixed(1)} Mbps (Fast)`;
        if (mbps >= 1) return `${mbps.toFixed(1)} Mbps (Good)`;
        return `${mbps.toFixed(2)} Mbps (Slow)`;
    };

    return (
        <div className="max-w-2xl">
            <h1 className="text-3xl font-light mb-3">Network</h1>
            <p className="text-sm text-white/60 mb-8">View your network connection status and metrics.</p>

            {/* Status Overview */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <StatCard
                    label="Status"
                    value={isOnline ? 'Connected' : 'Offline'}
                    icon={isOnline ? 'wifi' : 'wifi_off'}
                    color={isOnline ? 'green' : 'red'}
                />
                <StatCard
                    label="Connection Type"
                    value={connectionTypeLabels[effectiveType] || effectiveType}
                    icon="signal_cellular_alt"
                    color="blue"
                />
            </div>

            {/* Connection Details */}
            <section className="mb-8">
                <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <Icon name="lan" className="text-blue-400" />
                    Connection Details
                </h2>
                <div className="bg-black/20 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                        <span className="text-white/60">IP Address</span>
                        <span className="font-mono">{ip}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                        <span className="text-white/60">Effective Type</span>
                        <span>{connectionTypeLabels[effectiveType] || effectiveType}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                        <span className="text-white/60">Latency</span>
                        <span className="flex items-center gap-2">
                            {isMeasuringLatency ? (
                                <span className="text-white/40">Measuring...</span>
                            ) : (
                                formatLatency(latency)
                            )}
                        </span>
                    </div>
                    {downlink !== null && (
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-white/60">Downlink Speed</span>
                            <span>{formatDownlink(downlink)}</span>
                        </div>
                    )}
                    {rtt !== null && (
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-white/60">Round-Trip Time</span>
                            <span>{rtt}ms</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center py-2">
                        <span className="text-white/60">Data Saver</span>
                        <span>{saveData ? 'Enabled' : 'Disabled'}</span>
                    </div>
                </div>
            </section>

            {/* Actions */}
            <section>
                <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <Icon name="settings" className="text-purple-400" />
                    Actions
                </h2>
                <div className="flex gap-3">
                    <Button variant="secondary" size="sm" onClick={refresh}>
                        <Icon name="refresh" size="sm" />
                        Refresh Status
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void measureLatency()}
                        disabled={isMeasuringLatency || !isOnline}
                    >
                        <Icon name="speed" size="sm" />
                        {isMeasuringLatency ? 'Measuring...' : 'Test Latency'}
                    </Button>
                </div>
            </section>

            {/* Offline Notice */}
            {!isOnline && (
                <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                    <Icon name="cloud_off" className="text-red-400 mt-0.5" />
                    <div>
                        <h3 className="font-medium text-red-400">No Internet Connection</h3>
                        <p className="text-sm text-white/60 mt-1">
                            You appear to be offline. Some features may not work until you reconnect.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
