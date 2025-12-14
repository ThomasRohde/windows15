/**
 * AppRegistryContext - Application registration and lookup
 *
 * Manages the registry of available applications that can be launched
 * and displayed in windows. Apps are registered on boot and can be
 * looked up by ID when opening windows.
 *
 * @module context/AppRegistryContext
 */
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { AppConfig } from '../types';

/**
 * App registry context interface
 */
interface AppRegistryContextType {
    /** List of all registered applications */
    apps: AppConfig[];
    /**
     * Register a new application
     * @param config - Application configuration
     */
    registerApp: (config: AppConfig) => void;
    /**
     * Get an application by its ID
     * @param appId - The application ID to look up
     * @returns The app config or undefined if not found
     */
    getApp: (appId: string) => AppConfig | undefined;
}

const AppRegistryContext = createContext<AppRegistryContextType | undefined>(undefined);

/**
 * Hook to access the application registry
 *
 * @returns App registry context
 * @throws Error if used outside AppRegistryProvider
 *
 * @example
 * ```tsx
 * const { apps, registerApp, getApp } = useAppRegistry();
 *
 * // Register an app
 * registerApp({
 *   id: 'myapp',
 *   title: 'My App',
 *   icon: 'apps',
 *   color: 'text-blue-400',
 *   component: MyAppComponent,
 * });
 *
 * // Look up an app
 * const notepad = getApp('notepad');
 * ```
 */
export const useAppRegistry = () => {
    const context = useContext(AppRegistryContext);
    if (!context) {
        throw new Error('useAppRegistry must be used within an AppRegistryProvider');
    }
    return context;
};

interface AppRegistryProviderProps {
    children: ReactNode;
}

/**
 * Provider component for application registration.
 * Wraps the application to provide app registry context.
 */
export const AppRegistryProvider: React.FC<AppRegistryProviderProps> = ({ children }) => {
    const [apps, setApps] = useState<AppConfig[]>([]);

    const registerApp = useCallback((config: AppConfig) => {
        setApps(prev => {
            if (prev.find(a => a.id === config.id)) return prev;
            return [...prev, config];
        });
    }, []);

    const getApp = useCallback(
        (appId: string) => {
            return apps.find(a => a.id === appId);
        },
        [apps]
    );

    return <AppRegistryContext.Provider value={{ apps, registerApp, getApp }}>{children}</AppRegistryContext.Provider>;
};
