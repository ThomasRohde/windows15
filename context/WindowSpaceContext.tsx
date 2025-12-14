/**
 * WindowSpaceContext (F087)
 *
 * Manages 3D Window Space mode settings and state.
 * Provides perspective, depth, and tilt settings for windows.
 */
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useDb } from './DbContext';

/**
 * Window space rendering mode
 */
export type WindowSpaceMode = 'flat' | '3d';

/**
 * Motion preference
 */
export type MotionPreference = 'full' | 'reduced';

/**
 * Window space settings stored in kv table
 */
export interface WindowSpaceSettings {
    /** Display mode: flat (normal) or 3d (depth/perspective) */
    mode: WindowSpaceMode;
    /** CSS perspective value in pixels */
    perspective: number;
    /** Enable tilt effect on window drag */
    tiltOnDrag: boolean;
    /** Depth intensity multiplier (0-1) */
    depthIntensity: number;
    /** Respect reduced motion preference */
    motion: MotionPreference;
}

/**
 * Default window space settings
 */
export const DEFAULT_WINDOW_SPACE_SETTINGS: WindowSpaceSettings = {
    mode: 'flat',
    perspective: 1000,
    tiltOnDrag: true,
    depthIntensity: 0.5,
    motion: 'full',
};

/**
 * Depth step in pixels between windows (for translateZ)
 */
const DEPTH_STEP = 50;

/**
 * Scale factor per depth level
 */
const SCALE_STEP = 0.02;

/**
 * Context interface
 */
interface WindowSpaceContextType {
    /** Current settings */
    settings: WindowSpaceSettings;
    /** Whether 3D mode is active */
    is3DMode: boolean;
    /** Toggle between flat and 3D mode */
    toggle3DMode: () => void;
    /** Set specific mode */
    setMode: (mode: WindowSpaceMode) => void;
    /** Update settings */
    updateSettings: (update: Partial<WindowSpaceSettings>) => void;
    /** Get CSS transform for a window based on its z-order */
    getWindowTransform: (zIndex: number, maxZIndex: number, isFocused: boolean) => string;
    /** Get CSS shadow for a window based on its depth */
    getWindowShadow: (zIndex: number, maxZIndex: number) => string;
    /** Check if reduced motion is preferred */
    prefersReducedMotion: boolean;
}

const WindowSpaceContext = createContext<WindowSpaceContextType | undefined>(undefined);

/**
 * Hook to access window space context
 */
export const useWindowSpace = () => {
    const context = useContext(WindowSpaceContext);
    if (!context) {
        throw new Error('useWindowSpace must be used within a WindowSpaceProvider');
    }
    return context;
};

/**
 * Provider component
 */
export const WindowSpaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const db = useDb();
    const [settings, setSettings] = useState<WindowSpaceSettings>(DEFAULT_WINDOW_SPACE_SETTINGS);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    // Check system reduced motion preference
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);

        const handleChange = () => {
            setPrefersReducedMotion(mediaQuery.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    // Load settings from database
    useEffect(() => {
        const loadSettings = async () => {
            if (!db) return;

            try {
                const record = await db.kv.get('windowSpaceSettings');
                if (record) {
                    const saved = JSON.parse(record.valueJson) as Partial<WindowSpaceSettings>;
                    setSettings(prev => ({ ...prev, ...saved }));
                }
            } catch (error) {
                console.error('[WindowSpaceContext] Failed to load settings:', error);
            }
        };

        void loadSettings();
    }, [db]);

    // Save settings to database
    const saveSettings = useCallback(
        async (newSettings: WindowSpaceSettings) => {
            if (!db) return;

            try {
                await db.kv.put({
                    key: 'windowSpaceSettings',
                    valueJson: JSON.stringify(newSettings),
                });
            } catch (error) {
                console.error('[WindowSpaceContext] Failed to save settings:', error);
            }
        },
        [db]
    );

    // Toggle 3D mode
    const toggle3DMode = useCallback(() => {
        setSettings(prev => {
            const newMode = prev.mode === 'flat' ? '3d' : 'flat';
            const newSettings = { ...prev, mode: newMode };
            void saveSettings(newSettings);
            return newSettings;
        });
    }, [saveSettings]);

    // Set specific mode
    const setMode = useCallback(
        (mode: WindowSpaceMode) => {
            setSettings(prev => {
                const newSettings = { ...prev, mode };
                void saveSettings(newSettings);
                return newSettings;
            });
        },
        [saveSettings]
    );

    // Update settings
    const updateSettings = useCallback(
        (update: Partial<WindowSpaceSettings>) => {
            setSettings(prev => {
                const newSettings = { ...prev, ...update };
                void saveSettings(newSettings);
                return newSettings;
            });
        },
        [saveSettings]
    );

    // Check if 3D mode should be active (respects reduced motion)
    const is3DMode = useMemo(() => {
        if (settings.motion === 'reduced' || prefersReducedMotion) {
            return false;
        }
        return settings.mode === '3d';
    }, [settings.mode, settings.motion, prefersReducedMotion]);

    // Get CSS transform for a window
    const getWindowTransform = useCallback(
        (zIndex: number, maxZIndex: number, isFocused: boolean): string => {
            if (!is3DMode) {
                return ''; // No 3D transform in flat mode
            }

            // Calculate depth level (0 = focused, higher = further back)
            const depthLevel = isFocused ? 0 : maxZIndex - zIndex;
            const intensity = settings.depthIntensity;

            // Calculate Z offset and scale
            const zOffset = -depthLevel * DEPTH_STEP * intensity;
            const scale = 1 - depthLevel * SCALE_STEP * intensity;

            return `translateZ(${zOffset}px) scale(${Math.max(0.8, scale)})`;
        },
        [is3DMode, settings.depthIntensity]
    );

    // Get CSS shadow for a window based on depth
    const getWindowShadow = useCallback(
        (zIndex: number, maxZIndex: number): string => {
            if (!is3DMode) {
                // Default flat shadow
                return '0 10px 40px rgba(0, 0, 0, 0.3)';
            }

            // Deeper windows get larger, more spread shadows
            const depthLevel = maxZIndex - zIndex;
            const intensity = settings.depthIntensity;

            const baseBlur = 40;
            const baseSpread = 0;
            const baseOpacity = 0.3;

            const blur = baseBlur + depthLevel * 20 * intensity;
            const spread = baseSpread + depthLevel * 5 * intensity;
            const opacity = Math.min(0.5, baseOpacity + depthLevel * 0.05 * intensity);

            return `0 ${10 + depthLevel * 5}px ${blur}px ${spread}px rgba(0, 0, 0, ${opacity})`;
        },
        [is3DMode, settings.depthIntensity]
    );

    const value: WindowSpaceContextType = {
        settings,
        is3DMode,
        toggle3DMode,
        setMode,
        updateSettings,
        getWindowTransform,
        getWindowShadow,
        prefersReducedMotion,
    };

    return <WindowSpaceContext.Provider value={value}>{children}</WindowSpaceContext.Provider>;
};

export default WindowSpaceContext;
