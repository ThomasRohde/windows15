/**
 * This PC - Project Information Dashboard
 *
 * Displays Windows 15 project statistics and system information
 * including project version, app count, component count, and storage metrics.
 */
import React, { useMemo } from 'react';
import { Icon, Button } from '../components/ui';
import { useAppRegistry } from '../context/AppRegistryContext';
import { useSystemInfo } from '../context';
import { StatCard } from '../components/ui/StatCard';

// Import package.json metadata
import packageJson from '../package.json';

export const ThisPC = () => {
    const { apps } = useAppRegistry();
    const {
        cpuCores,
        memoryTotal,
        storageUsed,
        storageTotal,
        storagePercent,
        networkStatus,
        platform,
        language,
        uptimeFormatted,
    } = useSystemInfo();

    // Calculate statistics
    const stats = useMemo(() => {
        // Count total apps
        const appCount = apps.length;

        // Estimate component count (rough estimate based on common patterns)
        const componentCount = Math.floor(appCount * 2.5) + 15; // Base components + app components

        return {
            appCount,
            componentCount,
            version: packageJson.version === '0.0.0' ? '0.1.0' : packageJson.version,
            projectName: packageJson.name,
        };
    }, [apps]);

    // Format bytes helper
    const formatBytes = (bytes: number) => {
        if (bytes === 0) return 'Calculating...';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
    };

    const projectSpecs = [
        { label: 'Project Name', value: 'Windows 15' },
        { label: 'Version', value: `v${stats.version}` },
        { label: 'Total Applications', value: stats.appCount.toString() },
        { label: 'Total Components', value: `~${stats.componentCount}` },
        { label: 'Technology Stack', value: 'React 19 + TypeScript + Vite' },
        { label: 'UI Framework', value: 'Tailwind CSS' },
        { label: 'Uptime', value: uptimeFormatted },
    ];

    const storageSpecs = [
        { label: 'Storage Type', value: 'IndexedDB + LocalStorage' },
        { label: 'Used Space', value: formatBytes(storageUsed) },
        {
            label: 'Available Quota',
            value: formatBytes(storageTotal),
        },
        {
            label: 'Usage',
            value: storageTotal > 0 ? `${storagePercent}%` : 'Calculating...',
        },
    ];

    const browserSpecs = [
        { label: 'Platform', value: platform },
        { label: 'Language', value: language },
        { label: 'CPU Cores', value: cpuCores.toString() },
        { label: 'Device Memory', value: `${memoryTotal} GB` },
        { label: 'Network Status', value: networkStatus === 'online' ? 'Connected' : 'Offline' },
    ];

    return (
        <div className="h-full bg-background-dark text-white overflow-y-auto">
            <div className="p-6 max-w-4xl mx-auto">
                {/* Hero Section */}
                <div className="flex items-center gap-6 mb-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <Icon name="computer" size="xl" className="text-5xl text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-light">This PC</h1>
                        <p className="text-white/60 text-sm mt-1">Windows 15 Project Information</p>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard label="Applications" value={stats.appCount.toString()} icon="apps" color="blue" />
                    <StatCard label="Components" value={`~${stats.componentCount}`} icon="widgets" color="purple" />
                    <StatCard label="Version" value={`v${stats.version}`} icon="info" color="green" />
                    <StatCard
                        label="Status"
                        value={networkStatus === 'online' ? 'Connected' : 'Offline'}
                        icon="cloud"
                        color="cyan"
                    />
                </div>

                {/* Project Specifications */}
                <section className="mb-8">
                    <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                        <Icon name="settings_applications" className="text-blue-400" />
                        Project Specifications
                    </h2>
                    <div className="bg-black/20 rounded-xl p-4 space-y-3">
                        {projectSpecs.map((spec, i) => (
                            <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1">
                                <span className="text-white/60 text-sm sm:w-48">{spec.label}</span>
                                <span className="text-sm font-medium">{spec.value}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Storage Information */}
                <section className="mb-8">
                    <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                        <Icon name="storage" className="text-green-400" />
                        Storage & Database
                    </h2>
                    <div className="bg-black/20 rounded-xl p-4 space-y-3">
                        {storageSpecs.map((spec, i) => (
                            <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1">
                                <span className="text-white/60 text-sm sm:w-48">{spec.label}</span>
                                <span className="text-sm">{spec.value}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Browser/Environment Info */}
                <section className="mb-8">
                    <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                        <Icon name="public" className="text-purple-400" />
                        Browser Environment
                    </h2>
                    <div className="bg-black/20 rounded-xl p-4 space-y-3">
                        {browserSpecs.map((spec, i) => (
                            <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1">
                                <span className="text-white/60 text-sm sm:w-48">{spec.label}</span>
                                <span className="text-sm">{spec.value}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* About Section */}
                <section className="mb-8">
                    <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                        <Icon name="info" className="text-cyan-400" />
                        About Windows 15
                    </h2>
                    <div className="bg-black/20 rounded-xl p-4">
                        <p className="text-sm text-white/80 leading-relaxed mb-4">
                            Windows 15 is a modern web-based operating system simulation built with cutting-edge
                            technologies. It features a complete desktop environment with {stats.appCount} applications,
                            multi-window management, offline support via PWA, and real-time data synchronization using
                            IndexedDB and Dexie Cloud.
                        </p>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                                <Icon name="check_circle" className="text-green-400" size="sm" />
                                <span>Progressive Web App (PWA)</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Icon name="check_circle" className="text-green-400" size="sm" />
                                <span>Offline-first architecture</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Icon name="check_circle" className="text-green-400" size="sm" />
                                <span>Real-time cross-tab synchronization</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Icon name="check_circle" className="text-green-400" size="sm" />
                                <span>Modern UI with Tailwind CSS</span>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <p className="text-xs text-white/40">
                                © 2025 Windows15 Project. Built with React, TypeScript, and Vite. This is a
                                demonstration project and is not affiliated with Microsoft Corporation.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Action Buttons */}
                <div className="flex gap-3 flex-wrap">
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => window.open('https://github.com/ThomasRohde/windows15', '_blank')}
                    >
                        <Icon name="code" size="sm" />
                        View Source
                    </Button>
                </div>
            </div>
        </div>
    );
};
