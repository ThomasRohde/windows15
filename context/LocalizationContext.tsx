/**
 * LocalizationContext - Handles user locale preferences (units, clock format) and translations
 *
 * @module context/LocalizationContext
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { storageService, STORAGE_KEYS } from '../utils/storage';
import {
    ClockFormat,
    ClockFormatPreference,
    DEFAULT_LOCALIZATION_PREFERENCES,
    LocalizationPreferences,
    UnitSystem,
    UnitSystemPreference,
    getSystemLocale,
    normalizeLocalizationPreferences,
    resolveClockFormat,
    resolveUnitSystem,
} from '../utils/localization';
import enLocale from '../locales/en.json';

/**
 * Translation strings organized by namespace
 */
type TranslationStrings = typeof enLocale;
type Namespace = keyof TranslationStrings;

/**
 * Get nested value from object using dot-notation path
 */
const getNestedValue = (obj: Record<string, unknown>, path: string): string | undefined => {
    const keys = path.split('.');
    let current: unknown = obj;

    for (const key of keys) {
        if (current === null || current === undefined || typeof current !== 'object') {
            return undefined;
        }
        current = (current as Record<string, unknown>)[key];
    }

    return typeof current === 'string' ? current : undefined;
};

/**
 * Interpolate variables in a translation string
 * Supports {{variable}} syntax
 */
const interpolate = (str: string, vars?: Record<string, string | number>): string => {
    if (!vars) return str;
    return str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        const value = vars[key];
        return value !== undefined ? String(value) : `{{${key}}}`;
    });
};

/**
 * Translation function type
 */
export type TFunction = (key: string, vars?: Record<string, string | number>) => string;

interface LocalizationContextType {
    /** Current browser locale */
    locale: string;
    /** Resolved unit system (metric or imperial) */
    unitSystem: UnitSystem;
    /** Resolved clock format (12h or 24h) */
    clockFormat: ClockFormat;
    /** Raw preferences from storage */
    preferences: LocalizationPreferences;
    /** Update unit system preference */
    setUnitSystemPreference: (next: UnitSystemPreference) => void;
    /** Update clock format preference */
    setClockFormatPreference: (next: ClockFormatPreference) => void;
    /** Format time as short string (e.g., "3:45 PM") */
    formatTimeShort: (date: Date) => string;
    /** Format time as long string (e.g., "3:45:30 PM") */
    formatTimeLong: (date: Date) => string;
    /** Format date as short string (e.g., "12/18/2025") */
    formatDateShort: (date: Date) => string;
    /** Format date as long string (e.g., "Thursday, December 18, 2025") */
    formatDateLong: (date: Date) => string;
    /** Format time from HH:mm string */
    formatTimeShortFromHm: (hm: string) => string;
    /**
     * Get translation function for a namespace
     * @param namespace - The app/module namespace (e.g., 'calculator', 'common')
     * @returns Translation function that takes a key and optional variables
     */
    getTranslation: (namespace: Namespace) => TFunction;
    /**
     * Direct translation with full dot-notation path
     * @param key - Full key path (e.g., 'calculator.title', 'common.actions.save')
     * @param vars - Optional interpolation variables
     */
    t: TFunction;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

const arePreferencesEqual = (a: LocalizationPreferences, b: LocalizationPreferences): boolean =>
    a.unitSystem === b.unitSystem && a.clockFormat === b.clockFormat;

export const useLocalization = (): LocalizationContextType => {
    const context = useContext(LocalizationContext);
    if (!context) throw new Error('useLocalization must be used within a LocalizationProvider');
    return context;
};

export const LocalizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [preferences, setPreferences] = useState<LocalizationPreferences>(DEFAULT_LOCALIZATION_PREFERENCES);
    const locale = useMemo(() => getSystemLocale(), []);

    useEffect(() => {
        let didCancel = false;

        const load = async () => {
            try {
                const stored = await storageService.get<unknown>(STORAGE_KEYS.osLocalization);
                if (didCancel) return;
                const normalized = normalizeLocalizationPreferences(stored);
                setPreferences(prev => (arePreferencesEqual(prev, normalized) ? prev : normalized));
            } catch {
                // Best-effort.
            }
        };

        load();

        const unsubscribe = storageService.subscribe<unknown>(STORAGE_KEYS.osLocalization, value => {
            if (didCancel) return;
            const normalized = normalizeLocalizationPreferences(value);
            setPreferences(prev => (arePreferencesEqual(prev, normalized) ? prev : normalized));
        });

        return () => {
            didCancel = true;
            unsubscribe();
        };
    }, []);

    const unitSystem = useMemo(
        () => resolveUnitSystem(preferences.unitSystem, locale),
        [preferences.unitSystem, locale]
    );
    const clockFormat = useMemo(
        () => resolveClockFormat(preferences.clockFormat, locale),
        [preferences.clockFormat, locale]
    );
    const hour12 = clockFormat === '12h';

    const timeFormatterShort = useMemo(
        () => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12 }),
        [locale, hour12]
    );
    const timeFormatterLong = useMemo(
        () => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12 }),
        [locale, hour12]
    );
    const dateFormatterShort = useMemo(
        () => new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'numeric', day: 'numeric' }),
        [locale]
    );
    const dateFormatterLong = useMemo(
        () => new Intl.DateTimeFormat(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        [locale]
    );

    const persist = useCallback((next: LocalizationPreferences) => {
        storageService.set(STORAGE_KEYS.osLocalization, next).catch(() => undefined);
    }, []);

    const setUnitSystemPreference = useCallback(
        (next: UnitSystemPreference) => {
            setPreferences(prev => {
                const updated: LocalizationPreferences = { ...prev, unitSystem: next };
                persist(updated);
                return updated;
            });
        },
        [persist]
    );

    const setClockFormatPreference = useCallback(
        (next: ClockFormatPreference) => {
            setPreferences(prev => {
                const updated: LocalizationPreferences = { ...prev, clockFormat: next };
                persist(updated);
                return updated;
            });
        },
        [persist]
    );

    const formatTimeShort = useCallback((date: Date) => timeFormatterShort.format(date), [timeFormatterShort]);
    const formatTimeLong = useCallback((date: Date) => timeFormatterLong.format(date), [timeFormatterLong]);
    const formatDateShort = useCallback((date: Date) => dateFormatterShort.format(date), [dateFormatterShort]);
    const formatDateLong = useCallback((date: Date) => dateFormatterLong.format(date), [dateFormatterLong]);

    const formatTimeShortFromHm = useCallback(
        (hm: string) => {
            const [h, m] = hm.split(':').map(Number);
            const date = new Date();
            date.setHours(h || 0, m || 0, 0, 0);
            return timeFormatterShort.format(date);
        },
        [timeFormatterShort]
    );

    /**
     * Get translation function for a specific namespace
     */
    const getTranslation = useCallback((namespace: Namespace): TFunction => {
        const namespaceStrings = enLocale[namespace] as Record<string, unknown>;

        return (key: string, vars?: Record<string, string | number>): string => {
            const value = getNestedValue(namespaceStrings, key);
            if (value === undefined) {
                // Fall back to common namespace
                const commonValue = getNestedValue(enLocale.common as Record<string, unknown>, key);
                if (commonValue !== undefined) {
                    return interpolate(commonValue, vars);
                }
                // Return key as fallback for debugging
                console.warn(`Translation missing: ${namespace}.${key}`);
                return key;
            }
            return interpolate(value, vars);
        };
    }, []);

    /**
     * Direct translation with full dot-notation path
     */
    const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
        const value = getNestedValue(enLocale as unknown as Record<string, unknown>, key);
        if (value === undefined) {
            console.warn(`Translation missing: ${key}`);
            return key;
        }
        return interpolate(value, vars);
    }, []);

    const value: LocalizationContextType = {
        locale,
        unitSystem,
        clockFormat,
        preferences,
        setUnitSystemPreference,
        setClockFormatPreference,
        formatTimeShort,
        formatTimeLong,
        formatDateShort,
        formatDateLong,
        formatTimeShortFromHm,
        getTranslation,
        t,
    };

    return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
};
