/**
 * SystemInfoContext - Centralized system information management (F160)
 *
 * Provides:
 * - OS version and build information
 * - Uptime tracking (from app start)
 * - CPU cores count from navigator.hardwareConcurrency
 * - Memory information from navigator.deviceMemory
 * - Storage metrics from StorageManager API
 * - Network status monitoring
 * - 30-second polling for metric updates
 *
 * @module context/SystemInfoContext
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

// ==========================================
// Types
// ==========================================

export type NetworkStatus = 'online' | 'offline';

export interface SystemInfoContextValue {
    /** OS version string (e.g., "24H2") */
    osVersion: string;
    /** OS build number (e.g., "28500.1000") */
    osBuild: string;
    /** Uptime in milliseconds since app start */
    uptime: number;
    /** Formatted uptime string (e.g., "2h 15m") */
    uptimeFormatted: string;
    /** Number of logical CPU cores */
    cpuCores: number;
    /** Total device memory in GB (may be approximate) */
    memoryTotal: number;
    /** Simulated used memory in GB */
    memoryUsed: number;
    /** Memory usage percentage (0-100) */
    memoryPercent: number;
    /** Used storage in bytes */
    storageUsed: number;
    /** Total storage quota in bytes */
    storageTotal: number;
    /** Storage usage percentage (0-100) */
    storagePercent: number;
    /** Current network status */
    networkStatus: NetworkStatus;
    /** Simulated CPU usage percentage (0-100) */
    cpuPercent: number;
    /** Browser platform string */
    platform: string;
    /** Browser language */
    language: string;
    /** Whether battery info is available */
    hasBattery: boolean;
    /** Battery level percentage (0-100) */
    batteryLevel: number;
    /** Whether device is charging */
    batteryCharging: boolean;
    /** Force refresh metrics immediately */
    refresh: () => void;
}

// ==========================================
// Constants
// ==========================================

const OS_VERSION = '24H2';
const OS_BUILD = '28500.1000';
const POLLING_INTERVAL_MS = 30000; // 30 seconds
const CPU_UPDATE_INTERVAL_MS = 2000; // 2 seconds for smoother CPU simulation

// ==========================================
// Context
// ==========================================

const SystemInfoContext = createContext<SystemInfoContextValue | undefined>(undefined);

// ==========================================
// Helper Functions
// ==========================================

/**
 * Format uptime from milliseconds to human-readable string
 */
function formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
        return `${minutes}m`;
    }
    return `${seconds}s`;
}

/**
 * Get device memory with fallback
 */
function getDeviceMemory(): number {
    const nav = navigator as typeof navigator & { deviceMemory?: number };
    // deviceMemory returns an approximation in GB (e.g., 8, 4, 2, etc.)
    // If not available, estimate based on typical device (8GB)
    return nav.deviceMemory ?? 8;
}

/**
 * Get hardware concurrency with fallback
 */
function getCpuCores(): number {
    return navigator.hardwareConcurrency ?? 4;
}

// ==========================================
// Battery Manager Type
// ==========================================

interface BatteryManager {
    level: number;
    charging: boolean;
    addEventListener: (type: string, listener: () => void) => void;
    removeEventListener: (type: string, listener: () => void) => void;
}

// ==========================================
// Provider
// ==========================================

export interface SystemInfoProviderProps {
    children: ReactNode;
}

export const SystemInfoProvider: React.FC<SystemInfoProviderProps> = ({ children }) => {
    // Static values (set once on mount)
    const [cpuCores] = useState(() => getCpuCores());
    const [memoryTotal] = useState(() => getDeviceMemory());
    const [platform] = useState(() => navigator.platform || 'Web Platform');
    const [language] = useState(() => navigator.language || 'en-US');

    // Dynamic values
    const [uptime, setUptime] = useState(0);
    const [memoryUsed, setMemoryUsed] = useState(() => memoryTotal * 0.45); // Start at ~45% usage
    const [storageUsed, setStorageUsed] = useState(0);
    const [storageTotal, setStorageTotal] = useState(0);
    const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(navigator.onLine ? 'online' : 'offline');
    const [cpuPercent, setCpuPercent] = useState(25);

    // Battery state
    const [hasBattery, setHasBattery] = useState(false);
    const [batteryLevel, setBatteryLevel] = useState(100);
    const [batteryCharging, setBatteryCharging] = useState(false);

    // Track start time for uptime calculation
    const startTimeRef = useRef(Date.now());
    const batteryRef = useRef<BatteryManager | null>(null);

    // Calculate derived values
    const memoryPercent = Math.round((memoryUsed / memoryTotal) * 100);
    const storagePercent = storageTotal > 0 ? Math.round((storageUsed / storageTotal) * 100) : 0;
    const uptimeFormatted = formatUptime(uptime);

    // Fetch storage metrics
    const fetchStorageMetrics = useCallback(async () => {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                setStorageUsed(estimate.usage ?? 0);
                setStorageTotal(estimate.quota ?? 0);
            } catch (e) {
                // Storage API may fail in some contexts (e.g., incognito)
                console.warn('Failed to fetch storage estimate:', e);
            }
        }
    }, []);

    // Simulate memory usage fluctuation
    const updateMemoryUsage = useCallback(() => {
        setMemoryUsed(prev => {
            // Memory changes slowly and gradually
            const delta = (Math.random() - 0.5) * 0.2; // +/- 0.1 GB
            const minMemory = memoryTotal * 0.3;
            const maxMemory = memoryTotal * 0.85;
            const newValue = Math.max(minMemory, Math.min(maxMemory, prev + delta));
            return Math.round(newValue * 10) / 10; // Round to 1 decimal
        });
    }, [memoryTotal]);

    // Simulate CPU usage fluctuation
    const updateCpuUsage = useCallback(() => {
        setCpuPercent(prev => {
            // Realistic fluctuation: +/- 5-15%, with occasional spikes
            const shouldSpike = Math.random() < 0.1; // 10% chance of spike
            const delta = shouldSpike ? Math.random() * 30 : (Math.random() - 0.5) * 10;
            const newValue = Math.max(15, Math.min(85, prev + delta));
            return Math.round(newValue);
        });
    }, []);

    // Force refresh all metrics
    const refresh = useCallback(() => {
        void fetchStorageMetrics();
        updateMemoryUsage();
        updateCpuUsage();
        setUptime(Date.now() - startTimeRef.current);
    }, [fetchStorageMetrics, updateMemoryUsage, updateCpuUsage]);

    // Initialize battery monitoring
    useEffect(() => {
        const initBattery = async () => {
            if ('getBattery' in navigator) {
                try {
                    const battery = await (
                        navigator as typeof navigator & { getBattery(): Promise<BatteryManager> }
                    ).getBattery();
                    batteryRef.current = battery;
                    setHasBattery(true);

                    const updateBattery = () => {
                        setBatteryLevel(Math.round(battery.level * 100));
                        setBatteryCharging(battery.charging);
                    };

                    updateBattery();
                    battery.addEventListener('levelchange', updateBattery);
                    battery.addEventListener('chargingchange', updateBattery);
                } catch (e) {
                    // Battery API may not be available
                    console.warn('Battery API not available:', e);
                }
            }
        };

        void initBattery();

        return () => {
            // Cleanup battery listeners (if browser supports removeEventListener)
            if (batteryRef.current) {
                // Note: Battery API cleanup is automatic when the battery object is GC'd
            }
        };
    }, []);

    // Network status monitoring
    useEffect(() => {
        const handleOnline = () => setNetworkStatus('online');
        const handleOffline = () => setNetworkStatus('offline');

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Initial storage fetch
    useEffect(() => {
        void fetchStorageMetrics();
    }, [fetchStorageMetrics]);

    // Uptime update interval (every second)
    useEffect(() => {
        const interval = setInterval(() => {
            setUptime(Date.now() - startTimeRef.current);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // CPU update interval (every 2 seconds for smooth simulation)
    useEffect(() => {
        const interval = setInterval(updateCpuUsage, CPU_UPDATE_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [updateCpuUsage]);

    // Main polling interval (30 seconds) for storage and memory
    useEffect(() => {
        const interval = setInterval(() => {
            void fetchStorageMetrics();
            updateMemoryUsage();
        }, POLLING_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [fetchStorageMetrics, updateMemoryUsage]);

    // Build context value
    const value: SystemInfoContextValue = {
        osVersion: OS_VERSION,
        osBuild: OS_BUILD,
        uptime,
        uptimeFormatted,
        cpuCores,
        memoryTotal,
        memoryUsed,
        memoryPercent,
        storageUsed,
        storageTotal,
        storagePercent,
        networkStatus,
        cpuPercent,
        platform,
        language,
        hasBattery,
        batteryLevel,
        batteryCharging,
        refresh,
    };

    return <SystemInfoContext.Provider value={value}>{children}</SystemInfoContext.Provider>;
};

// ==========================================
// Hook
// ==========================================

/**
 * Hook to access system information
 *
 * @returns SystemInfoContextValue with all system metrics
 * @throws Error if used outside SystemInfoProvider
 *
 * @example
 * ```tsx
 * const { cpuPercent, memoryPercent, networkStatus, uptimeFormatted } = useSystemInfo();
 *
 * return (
 *   <div>
 *     <p>CPU: {cpuPercent}%</p>
 *     <p>Memory: {memoryPercent}%</p>
 *     <p>Network: {networkStatus}</p>
 *     <p>Uptime: {uptimeFormatted}</p>
 *   </div>
 * );
 * ```
 */
export function useSystemInfo(): SystemInfoContextValue {
    const context = useContext(SystemInfoContext);
    if (!context) {
        throw new Error('useSystemInfo must be used within a SystemInfoProvider');
    }
    return context;
}
