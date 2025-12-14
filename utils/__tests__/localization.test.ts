import { describe, it, expect } from 'vitest';
import {
    DEFAULT_LOCALIZATION_PREFERENCES,
    formatSpeed,
    formatTemperature,
    normalizeLocalizationPreferences,
    resolveClockFormat,
    resolveUnitSystem,
} from '../localization';

describe('localization utils', () => {
    it('normalizes unknown values to defaults', () => {
        expect(normalizeLocalizationPreferences(undefined)).toEqual(DEFAULT_LOCALIZATION_PREFERENCES);
        expect(normalizeLocalizationPreferences(null)).toEqual(DEFAULT_LOCALIZATION_PREFERENCES);
        expect(normalizeLocalizationPreferences('nope')).toEqual(DEFAULT_LOCALIZATION_PREFERENCES);
        expect(normalizeLocalizationPreferences({})).toEqual(DEFAULT_LOCALIZATION_PREFERENCES);
        expect(
            normalizeLocalizationPreferences({
                unitSystem: 'metric',
                clockFormat: 'nope',
            })
        ).toEqual({ unitSystem: 'metric', clockFormat: 'system' });
    });

    it('resolves unit system from locale when set to system', () => {
        expect(resolveUnitSystem('system', 'en-US')).toBe('imperial');
        expect(resolveUnitSystem('system', 'en-GB')).toBe('metric');
        expect(resolveUnitSystem('metric', 'en-US')).toBe('metric');
        expect(resolveUnitSystem('imperial', 'en-GB')).toBe('imperial');
    });

    it('resolves clock format explicitly', () => {
        expect(resolveClockFormat('12h', 'en-US')).toBe('12h');
        expect(resolveClockFormat('24h', 'en-US')).toBe('24h');
    });

    it('formats temperature based on unit system', () => {
        expect(formatTemperature(0, 'metric')).toEqual({ value: 0, unit: '°C' });
        expect(formatTemperature(0, 'imperial')).toEqual({ value: 32, unit: '°F' });
        expect(formatTemperature(100, 'imperial')).toEqual({ value: 212, unit: '°F' });
    });

    it('formats speed based on unit system', () => {
        expect(formatSpeed(10, 'metric')).toEqual({ value: 10, unit: 'km/h' });
        expect(formatSpeed(16.09344, 'imperial')).toEqual({ value: 10, unit: 'mph' });
    });
});
