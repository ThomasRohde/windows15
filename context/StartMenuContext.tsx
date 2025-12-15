/**
 * StartMenuContext - Handles start menu state and pinned apps
 */
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useDb } from './DbContext';
import { useDexieLiveQuery } from '../utils/storage/react';

// Default pinned apps (same as taskbar for consistency)
const DEFAULT_PINNED_APPS = ['explorer', 'browser', 'mail', 'calendar', 'notepad', 'calculator', 'settings'];

interface StartMenuContextType {
    isStartMenuOpen: boolean;
    toggleStartMenu: () => void;
    closeStartMenu: () => void;
    openStartMenu: () => void;
    // Pinned apps
    pinnedApps: string[];
    pinApp: (appId: string) => Promise<void>;
    unpinApp: (appId: string) => Promise<void>;
    isPinned: (appId: string) => boolean;
    // All apps view toggle
    showAllApps: boolean;
    toggleAllApps: () => void;
    setShowAllApps: (show: boolean) => void;
}

const StartMenuContext = createContext<StartMenuContextType | undefined>(undefined);

/**
 * Hook to access start menu state
 */
export const useStartMenu = () => {
    const context = useContext(StartMenuContext);
    if (!context) {
        throw new Error('useStartMenu must be used within a StartMenuProvider');
    }
    return context;
};

interface StartMenuProviderProps {
    children: ReactNode;
}

/**
 * Provider for start menu state management
 */
export const StartMenuProvider: React.FC<StartMenuProviderProps> = ({ children }) => {
    const db = useDb();
    const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
    const [showAllApps, setShowAllApps] = useState(false);

    // Load pinned apps from DB reactively
    const { value: pinnedRecord, isLoading } = useDexieLiveQuery(() => db.kv.get('pinnedApps'), [db]);

    const pinnedApps: string[] = pinnedRecord?.valueJson ? JSON.parse(pinnedRecord.valueJson) : DEFAULT_PINNED_APPS;

    // Initialize default pinned apps if not set
    useEffect(() => {
        if (!isLoading && !pinnedRecord) {
            db.kv.put({
                key: 'pinnedApps',
                valueJson: JSON.stringify(DEFAULT_PINNED_APPS),
                updatedAt: Date.now(),
            });
        }
    }, [db, isLoading, pinnedRecord]);

    const toggleStartMenu = useCallback(() => {
        setIsStartMenuOpen(prev => !prev);
        // Reset to pinned view when closing
        setShowAllApps(false);
    }, []);

    const closeStartMenu = useCallback(() => {
        setIsStartMenuOpen(false);
        setShowAllApps(false);
    }, []);

    const openStartMenu = useCallback(() => setIsStartMenuOpen(true), []);

    const toggleAllApps = useCallback(() => setShowAllApps(prev => !prev), []);

    const pinApp = useCallback(
        async (appId: string) => {
            if (pinnedApps.includes(appId)) return;
            const newPinned = [...pinnedApps, appId];
            await db.kv.put({
                key: 'pinnedApps',
                valueJson: JSON.stringify(newPinned),
                updatedAt: Date.now(),
            });
        },
        [db, pinnedApps]
    );

    const unpinApp = useCallback(
        async (appId: string) => {
            const newPinned = pinnedApps.filter(id => id !== appId);
            await db.kv.put({
                key: 'pinnedApps',
                valueJson: JSON.stringify(newPinned),
                updatedAt: Date.now(),
            });
        },
        [db, pinnedApps]
    );

    const isPinned = useCallback((appId: string) => pinnedApps.includes(appId), [pinnedApps]);

    return (
        <StartMenuContext.Provider
            value={{
                isStartMenuOpen,
                toggleStartMenu,
                closeStartMenu,
                openStartMenu,
                pinnedApps,
                pinApp,
                unpinApp,
                isPinned,
                showAllApps,
                toggleAllApps,
                setShowAllApps,
            }}
        >
            {children}
        </StartMenuContext.Provider>
    );
};
