/**
 * Window Persistence Hook
 *
 * Handles saving and loading window states from storage.
 */
import { useRef, useEffect, useState } from 'react';
import { WindowStateRecord } from '../utils/fileSystem';
import { storageService } from '../utils/storage';

const KV_KEYS = {
    openWindows: 'windows15.os.openWindows',
    windowStates: 'windows15.os.windowStates',
} as const;

export interface UseWindowPersistenceResult {
    isInitialized: boolean;
    savedWindowStates: WindowStateRecord[];
    openAppIds: string[];
    persistWindowStates: (appIds: string[], states: WindowStateRecord[]) => void;
    updateSavedState: (
        appId: string,
        position: { x: number; y: number },
        size: { width: number; height: number }
    ) => void;
    getSavedState: (appId: string) => WindowStateRecord | undefined;
}

export const useWindowPersistence = (): UseWindowPersistenceResult => {
    const [isInitialized, setIsInitialized] = useState(false);
    const savedWindowStatesRef = useRef<WindowStateRecord[]>([]);
    const openAppIdsRef = useRef<string[]>([]);

    // Load persisted data on mount
    useEffect(() => {
        const initialize = async () => {
            try {
                const [savedStates, savedOpenApps] = await Promise.all([
                    storageService.get<WindowStateRecord[]>(KV_KEYS.windowStates),
                    storageService.get<string[]>(KV_KEYS.openWindows),
                ]);

                if (Array.isArray(savedStates)) {
                    savedWindowStatesRef.current = savedStates;
                }

                if (Array.isArray(savedOpenApps) && savedOpenApps.length > 0) {
                    openAppIdsRef.current = savedOpenApps;
                }
            } catch (error) {
                console.error('Failed to load window states:', error);
            } finally {
                setIsInitialized(true);
            }
        };
        initialize();
    }, []);

    const persistWindowStates = (appIds: string[], states: WindowStateRecord[]) => {
        savedWindowStatesRef.current = states;
        storageService.set(KV_KEYS.windowStates, states).catch(() => undefined);
        storageService.set(KV_KEYS.openWindows, appIds).catch(() => undefined);
    };

    const updateSavedState = (
        appId: string,
        position: { x: number; y: number },
        size: { width: number; height: number }
    ) => {
        const newRecord: WindowStateRecord = { appId, state: { position, size } };
        const existingIndex = savedWindowStatesRef.current.findIndex(s => s.appId === appId);

        if (existingIndex >= 0) {
            savedWindowStatesRef.current[existingIndex] = newRecord;
        } else {
            savedWindowStatesRef.current.push(newRecord);
        }

        storageService.set(KV_KEYS.windowStates, savedWindowStatesRef.current).catch(() => undefined);
    };

    const getSavedState = (appId: string) => {
        return savedWindowStatesRef.current.find(s => s.appId === appId);
    };

    return {
        isInitialized,
        savedWindowStates: savedWindowStatesRef.current,
        openAppIds: openAppIdsRef.current,
        persistWindowStates,
        updateSavedState,
        getSavedState,
    };
};
