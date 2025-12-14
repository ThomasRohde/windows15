/**
 * AppRegistryContext - Handles application registration
 */
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { AppConfig } from '../types';

interface AppRegistryContextType {
    apps: AppConfig[];
    registerApp: (config: AppConfig) => void;
    getApp: (appId: string) => AppConfig | undefined;
}

const AppRegistryContext = createContext<AppRegistryContextType | undefined>(undefined);

/**
 * Hook to access the app registry
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
 * Provider for application registration and lookup
 */
export const AppRegistryProvider: React.FC<AppRegistryProviderProps> = ({ children }) => {
    const [apps, setApps] = useState<AppConfig[]>([]);

    const registerApp = useCallback((config: AppConfig) => {
        setApps(prev => {
            if (prev.find(a => a.id === config.id)) return prev;
            return [...prev, config];
        });
    }, []);

    const getApp = useCallback((appId: string) => {
        return apps.find(a => a.id === appId);
    }, [apps]);

    return (
        <AppRegistryContext.Provider value={{ apps, registerApp, getApp }}>
            {children}
        </AppRegistryContext.Provider>
    );
};
