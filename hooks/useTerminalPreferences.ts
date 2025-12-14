import { useState, useEffect, useCallback } from 'react';
import { useDb } from '../context/DbContext';
import {
    DEFAULT_TERMINAL_PREFERENCES,
    TERMINAL_THEMES,
    TERMINAL_FONTS,
    type TerminalPreferences,
    type TerminalTheme,
} from '../types/terminal';

const KV_KEYS = {
    THEME: 'terminal.theme',
    FONT_SIZE: 'terminal.fontSize',
    FONT_FAMILY: 'terminal.fontFamily',
} as const;

export const useTerminalPreferences = () => {
    const db = useDb();
    const [preferences, setPreferences] = useState<TerminalPreferences>(DEFAULT_TERMINAL_PREFERENCES);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load preferences from IndexedDB on mount
    useEffect(() => {
        const loadPreferences = async () => {
            if (!db) return;

            try {
                const [themeRecord, fontSizeRecord, fontFamilyRecord] = await Promise.all([
                    db.kv.get(KV_KEYS.THEME),
                    db.kv.get(KV_KEYS.FONT_SIZE),
                    db.kv.get(KV_KEYS.FONT_FAMILY),
                ]);

                const loadedPrefs: TerminalPreferences = {
                    theme: themeRecord ? JSON.parse(themeRecord.valueJson) : DEFAULT_TERMINAL_PREFERENCES.theme,
                    fontSize: fontSizeRecord
                        ? JSON.parse(fontSizeRecord.valueJson)
                        : DEFAULT_TERMINAL_PREFERENCES.fontSize,
                    fontFamily: fontFamilyRecord
                        ? JSON.parse(fontFamilyRecord.valueJson)
                        : DEFAULT_TERMINAL_PREFERENCES.fontFamily,
                };

                setPreferences(loadedPrefs);
            } catch (error) {
                console.error('Failed to load terminal preferences:', error);
            }

            setIsLoaded(true);
        };

        void loadPreferences();
    }, [db]);

    const setTheme = useCallback(
        async (themeName: string): Promise<boolean> => {
            if (!db) return false;

            // Validate theme exists
            if (!TERMINAL_THEMES[themeName]) {
                return false;
            }

            try {
                const now = Date.now();
                await db.kv.put({
                    key: KV_KEYS.THEME,
                    valueJson: JSON.stringify(themeName),
                    updatedAt: now,
                });

                setPreferences(prev => ({ ...prev, theme: themeName }));
                return true;
            } catch (error) {
                console.error('Failed to save theme preference:', error);
                return false;
            }
        },
        [db]
    );

    const setFontSize = useCallback(
        async (fontSize: number): Promise<boolean> => {
            if (!db) return false;

            // Validate font size range
            if (fontSize < 10 || fontSize > 18) {
                return false;
            }

            try {
                const now = Date.now();
                await db.kv.put({
                    key: KV_KEYS.FONT_SIZE,
                    valueJson: JSON.stringify(fontSize),
                    updatedAt: now,
                });

                setPreferences(prev => ({ ...prev, fontSize }));
                return true;
            } catch (error) {
                console.error('Failed to save font size preference:', error);
                return false;
            }
        },
        [db]
    );

    const setFontFamily = useCallback(
        async (fontFamily: string): Promise<boolean> => {
            if (!db) return false;

            // Validate font family exists
            if (!TERMINAL_FONTS.includes(fontFamily)) {
                return false;
            }

            try {
                const now = Date.now();
                await db.kv.put({
                    key: KV_KEYS.FONT_FAMILY,
                    valueJson: JSON.stringify(fontFamily),
                    updatedAt: now,
                });

                setPreferences(prev => ({ ...prev, fontFamily }));
                return true;
            } catch (error) {
                console.error('Failed to save font family preference:', error);
                return false;
            }
        },
        [db]
    );

    const currentTheme: TerminalTheme = TERMINAL_THEMES[preferences.theme] || TERMINAL_THEMES.classic;

    return {
        preferences,
        currentTheme,
        isLoaded,
        setTheme,
        setFontSize,
        setFontFamily,
        availableThemes: Object.values(TERMINAL_THEMES),
        availableFonts: TERMINAL_FONTS,
    };
};
