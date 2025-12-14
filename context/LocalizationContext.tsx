/**
 * LocalizationContext - Handles user locale preferences (units, clock format)
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

interface LocalizationContextType {
    locale: string;
    unitSystem: UnitSystem;
    clockFormat: ClockFormat;
    preferences: LocalizationPreferences;
    setUnitSystemPreference: (next: UnitSystemPreference) => void;
    setClockFormatPreference: (next: ClockFormatPreference) => void;
    formatTimeShort: (date: Date) => string;
    formatTimeLong: (date: Date) => string;
    formatDateShort: (date: Date) => string;
    formatDateLong: (date: Date) => string;
    formatTimeShortFromHm: (hm: string) => string;
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
    };

    return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
};
