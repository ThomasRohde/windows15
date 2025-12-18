/**
 * ScreensaverContext - Manages screensaver activation and idle timeout tracking
 *
 * Tracks global mouse/keyboard activity and activates the screensaver after
 * the configured idle timeout. Any user input immediately exits the screensaver.
 */
import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { useDb } from './DbContext';
import { useDexieLiveQuery } from '../utils/storage/react';
import { ScreensaverSettingsRecord } from '../utils/storage/db';

interface ScreensaverContextType {
    isScreensaverActive: boolean;
    activateScreensaver: () => void;
    deactivateScreensaver: () => void;
    settings: ScreensaverSettingsRecord | null;
    updateSettings: (settings: Partial<ScreensaverSettingsRecord>) => Promise<void>;
}

const ScreensaverContext = createContext<ScreensaverContextType | undefined>(undefined);

export const useScreensaver = () => {
    const context = useContext(ScreensaverContext);
    if (!context) throw new Error('useScreensaver must be used within a ScreensaverProvider');
    return context;
};

const DEFAULT_SETTINGS_ID = 'default';
const DEFAULT_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

export const ScreensaverProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const db = useDb();
    const [isScreensaverActive, setIsScreensaverActive] = useState(false);
    const lastActivityRef = useRef<number>(Date.now());
    const idleTimerRef = useRef<number | null>(null);

    // Load screensaver settings reactively
    const { value: settingsArray } = useDexieLiveQuery(
        () => db.$screensaverSettings.where('id').equals(DEFAULT_SETTINGS_ID).toArray(),
        [db]
    );
    const settings = settingsArray?.[0] || null;

    // Initialize default settings if none exist
    useEffect(() => {
        const initializeSettings = async () => {
            const count = await db.$screensaverSettings.count();
            if (count === 0) {
                const now = Date.now();
                await db.$screensaverSettings.add({
                    id: DEFAULT_SETTINGS_ID,
                    enabled: true,
                    timeout: DEFAULT_TIMEOUT,
                    animation: 'starfield',
                    animationSpeed: 1,
                    animationIntensity: 1,
                    showClock: false,
                    showDate: false,
                    createdAt: now,
                    updatedAt: now,
                });
            }
        };
        initializeSettings().catch(err => {
            console.error('[Screensaver] Settings initialization error:', err);
        });
    }, [db]);

    // Update settings helper
    const updateSettings = useCallback(
        async (updates: Partial<ScreensaverSettingsRecord>) => {
            await db.$screensaverSettings.update(DEFAULT_SETTINGS_ID, {
                ...updates,
                updatedAt: Date.now(),
            });
        },
        [db]
    );

    // Activate screensaver
    const activateScreensaver = useCallback(() => {
        if (settings?.enabled) {
            setIsScreensaverActive(true);
        }
    }, [settings?.enabled]);

    // Deactivate screensaver
    const deactivateScreensaver = useCallback(() => {
        setIsScreensaverActive(false);
        lastActivityRef.current = Date.now();
    }, []);

    // Reset idle timer when there's user activity
    const resetIdleTimer = useCallback(() => {
        lastActivityRef.current = Date.now();
        if (isScreensaverActive) {
            deactivateScreensaver();
        }
    }, [isScreensaverActive, deactivateScreensaver]);

    // Setup idle detection
    useEffect(() => {
        if (!settings?.enabled) {
            return;
        }

        // Event handlers for user activity
        const handleActivity = () => {
            resetIdleTimer();
        };

        // Listen for mouse/keyboard events
        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('mousedown', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('touchstart', handleActivity);
        window.addEventListener('scroll', handleActivity);

        // Check idle timeout periodically (every second)
        const checkIdleTimeout = () => {
            const idleTime = Date.now() - lastActivityRef.current;
            if (idleTime >= (settings?.timeout || DEFAULT_TIMEOUT) && !isScreensaverActive) {
                activateScreensaver();
            }
        };

        idleTimerRef.current = window.setInterval(checkIdleTimeout, 1000);

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('mousedown', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
            window.removeEventListener('scroll', handleActivity);
            if (idleTimerRef.current !== null) {
                clearInterval(idleTimerRef.current);
            }
        };
    }, [settings?.enabled, settings?.timeout, isScreensaverActive, activateScreensaver, resetIdleTimer]);

    const value: ScreensaverContextType = {
        isScreensaverActive,
        activateScreensaver,
        deactivateScreensaver,
        settings,
        updateSettings,
    };

    return <ScreensaverContext.Provider value={value}>{children}</ScreensaverContext.Provider>;
};
