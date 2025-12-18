/**
 * NetworkContext - Centralized network status management (F162)
 *
 * Provides:
 * - Real-time online/offline status via navigator.onLine
 * - Effective network type via NetworkInformation API
 * - IP address (mocked for privacy)
 * - Network latency measurement via fetch
 * - Reactive updates on network status changes
 *
 * @module context/NetworkContext
 */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// ==========================================
// Types
// ==========================================

export type EffectiveType = 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';

export interface NetworkContextValue {
    /** Whether the browser reports being online */
    isOnline: boolean;
    /** Effective network connection type (4g, 3g, 2g, slow-2g) */
    effectiveType: EffectiveType;
    /** Simulated local IP address (mocked for privacy) */
    ip: string;
    /** Measured network latency in milliseconds */
    latency: number | null;
    /** Whether latency is currently being measured */
    isMeasuringLatency: boolean;
    /** Downlink speed estimate in Mbps (if available) */
    downlink: number | null;
    /** Round-trip time estimate in ms (if available) */
    rtt: number | null;
    /** Whether data saver mode is enabled (if available) */
    saveData: boolean;
    /** Force refresh network status and remeasure latency */
    refresh: () => void;
    /** Measure network latency manually */
    measureLatency: () => Promise<number | null>;
}

// ==========================================
// Constants
// ==========================================

const LATENCY_CHECK_URL = 'https://www.google.com/generate_204';
const LATENCY_MEASURE_INTERVAL_MS = 60000; // 1 minute
const MOCK_LOCAL_IP = '192.168.1.100';

// ==========================================
// Context
// ==========================================

const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

// ==========================================
// NetworkInformation API Types
// ==========================================

interface NetworkInformation {
    readonly effectiveType?: EffectiveType;
    readonly downlink?: number;
    readonly rtt?: number;
    readonly saveData?: boolean;
    onchange?: ((this: NetworkInformation, ev: Event) => void) | null;
    addEventListener: (type: string, listener: () => void) => void;
    removeEventListener: (type: string, listener: () => void) => void;
}

interface NavigatorWithConnection {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
}

// ==========================================
// Helper Functions
// ==========================================

/**
 * Get the NetworkInformation object if available
 */
function getNetworkConnection(): NetworkInformation | null {
    const nav = navigator as NavigatorWithConnection;
    return nav.connection || nav.mozConnection || nav.webkitConnection || null;
}

// ==========================================
// Provider
// ==========================================

export interface NetworkProviderProps {
    children: ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [effectiveType, setEffectiveType] = useState<EffectiveType>(() => {
        const connection = getNetworkConnection();
        return connection?.effectiveType ?? '4g';
    });
    const [downlink, setDownlink] = useState<number | null>(() => {
        const connection = getNetworkConnection();
        return connection?.downlink ?? null;
    });
    const [rtt, setRtt] = useState<number | null>(() => {
        const connection = getNetworkConnection();
        return connection?.rtt ?? null;
    });
    const [saveData, setSaveData] = useState<boolean>(() => {
        const connection = getNetworkConnection();
        return connection?.saveData ?? false;
    });
    const [latency, setLatency] = useState<number | null>(null);
    const [isMeasuringLatency, setIsMeasuringLatency] = useState(false);

    /**
     * Measure network latency by timing a small fetch request
     */
    const measureLatency = useCallback(async (): Promise<number | null> => {
        if (!navigator.onLine) {
            setLatency(null);
            return null;
        }

        setIsMeasuringLatency(true);
        try {
            const start = performance.now();
            // Use a small request that returns 204 No Content
            await fetch(LATENCY_CHECK_URL, {
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-store',
            });
            const end = performance.now();
            const measuredLatency = Math.round(end - start);
            setLatency(measuredLatency);
            return measuredLatency;
        } catch {
            // Network error - can't measure latency
            setLatency(null);
            return null;
        } finally {
            setIsMeasuringLatency(false);
        }
    }, []);

    /**
     * Update all network info from the connection API
     */
    const updateConnectionInfo = useCallback(() => {
        const connection = getNetworkConnection();
        if (connection) {
            setEffectiveType(connection.effectiveType ?? '4g');
            setDownlink(connection.downlink ?? null);
            setRtt(connection.rtt ?? null);
            setSaveData(connection.saveData ?? false);
        }
    }, []);

    /**
     * Force refresh all network data
     */
    const refresh = useCallback(() => {
        setIsOnline(navigator.onLine);
        updateConnectionInfo();
        void measureLatency();
    }, [updateConnectionInfo, measureLatency]);

    // Online/offline event listeners
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            // Remeasure latency when coming back online
            void measureLatency();
        };

        const handleOffline = () => {
            setIsOnline(false);
            setLatency(null);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [measureLatency]);

    // NetworkInformation API change listener
    useEffect(() => {
        const connection = getNetworkConnection();
        if (!connection) return;

        const handleChange = () => {
            updateConnectionInfo();
        };

        connection.addEventListener('change', handleChange);
        return () => {
            connection.removeEventListener('change', handleChange);
        };
    }, [updateConnectionInfo]);

    // Initial latency measurement
    useEffect(() => {
        void measureLatency();
    }, [measureLatency]);

    // Periodic latency measurement
    useEffect(() => {
        const interval = setInterval(() => {
            if (navigator.onLine) {
                void measureLatency();
            }
        }, LATENCY_MEASURE_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [measureLatency]);

    // Build context value
    const value: NetworkContextValue = {
        isOnline,
        effectiveType,
        ip: MOCK_LOCAL_IP,
        latency,
        isMeasuringLatency,
        downlink,
        rtt,
        saveData,
        refresh,
        measureLatency,
    };

    return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
};

// ==========================================
// Hook
// ==========================================

/**
 * Hook to access network status information
 *
 * @returns NetworkContextValue with all network metrics
 * @throws Error if used outside NetworkProvider
 *
 * @example
 * ```tsx
 * const { isOnline, effectiveType, latency } = useNetwork();
 *
 * return (
 *   <div>
 *     <p>Status: {isOnline ? 'Online' : 'Offline'}</p>
 *     <p>Connection: {effectiveType}</p>
 *     <p>Latency: {latency}ms</p>
 *   </div>
 * );
 * ```
 */
export function useNetwork(): NetworkContextValue {
    const context = useContext(NetworkContext);
    if (!context) {
        throw new Error('useNetwork must be used within a NetworkProvider');
    }
    return context;
}
