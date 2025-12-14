export type UnitSystemPreference = 'system' | 'metric' | 'imperial';
export type UnitSystem = Exclude<UnitSystemPreference, 'system'>;

export type ClockFormatPreference = 'system' | '12h' | '24h';
export type ClockFormat = Exclude<ClockFormatPreference, 'system'>;

export interface LocalizationPreferences {
    unitSystem: UnitSystemPreference;
    clockFormat: ClockFormatPreference;
}

export const DEFAULT_LOCALIZATION_PREFERENCES: LocalizationPreferences = {
    unitSystem: 'system',
    clockFormat: 'system',
};

const UNIT_SYSTEM_PREFERENCES: readonly UnitSystemPreference[] = ['system', 'metric', 'imperial'] as const;
const CLOCK_FORMAT_PREFERENCES: readonly ClockFormatPreference[] = ['system', '12h', '24h'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isOneOf = <T extends string>(value: unknown, allowed: readonly T[]): value is T =>
    typeof value === 'string' && allowed.includes(value as T);

export const normalizeLocalizationPreferences = (value: unknown): LocalizationPreferences => {
    if (!isRecord(value)) return DEFAULT_LOCALIZATION_PREFERENCES;

    const unitSystem = isOneOf(value.unitSystem, UNIT_SYSTEM_PREFERENCES) ? value.unitSystem : 'system';
    const clockFormat = isOneOf(value.clockFormat, CLOCK_FORMAT_PREFERENCES) ? value.clockFormat : 'system';

    return { unitSystem, clockFormat };
};

export const getSystemLocale = (): string => {
    try {
        const resolved = new Intl.DateTimeFormat().resolvedOptions().locale;
        if (resolved) return resolved;
    } catch {
        // Ignore.
    }

    try {
        const navLang = globalThis.navigator?.language;
        if (navLang) return navLang;
    } catch {
        // Ignore.
    }

    return 'en-US';
};

const getRegionFromLocale = (locale: string): string | null => {
    const normalized = String(locale ?? '');
    if (!normalized) return null;

    // Try Intl.Locale first (more robust).
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const LocaleCtor: any = (Intl as any).Locale;
        if (typeof LocaleCtor === 'function') {
            const loc = new LocaleCtor(normalized);
            const region = loc?.region;
            if (typeof region === 'string' && region) return region.toUpperCase();
        }
    } catch {
        // Ignore.
    }

    // Fallback: parse BCP47-ish tag (e.g., en-US, zh-Hant-TW).
    const parts = normalized.replace('_', '-').split('-');
    for (const part of parts) {
        if (/^[A-Za-z]{2}$/.test(part)) {
            return part.toUpperCase();
        }
        if (/^\d{3}$/.test(part)) {
            return part;
        }
    }

    return null;
};

export const resolveUnitSystem = (pref: UnitSystemPreference, locale: string): UnitSystem => {
    if (pref === 'metric' || pref === 'imperial') return pref;

    const region = getRegionFromLocale(locale);
    const imperialRegions = new Set(['US', 'LR', 'MM']);
    return region && imperialRegions.has(region) ? 'imperial' : 'metric';
};

export const resolveClockFormat = (pref: ClockFormatPreference, locale: string): ClockFormat => {
    if (pref === '12h' || pref === '24h') return pref;

    try {
        const hour12 = new Intl.DateTimeFormat(locale || undefined, { hour: 'numeric' }).resolvedOptions().hour12;
        if (hour12 === true) return '12h';
        if (hour12 === false) return '24h';
    } catch {
        // Ignore.
    }

    return '24h';
};

export const formatTemperature = (celsius: number, unitSystem: UnitSystem): { value: number; unit: '°C' | '°F' } => {
    if (!Number.isFinite(celsius)) return { value: 0, unit: unitSystem === 'imperial' ? '°F' : '°C' };

    if (unitSystem === 'imperial') {
        const f = (celsius * 9) / 5 + 32;
        return { value: Math.round(f), unit: '°F' };
    }

    return { value: Math.round(celsius), unit: '°C' };
};

export const formatSpeed = (kmh: number, unitSystem: UnitSystem): { value: number; unit: 'km/h' | 'mph' } => {
    if (!Number.isFinite(kmh)) return { value: 0, unit: unitSystem === 'imperial' ? 'mph' : 'km/h' };

    if (unitSystem === 'imperial') {
        const mph = kmh / 1.609344;
        return { value: Math.round(mph), unit: 'mph' };
    }

    return { value: Math.round(kmh), unit: 'km/h' };
};
