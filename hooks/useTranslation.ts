/**
 * useTranslation - Hook for accessing translations with namespace support
 *
 * Provides a convenient way to access localized strings with automatic
 * fallback to common strings and interpolation support.
 *
 * @module hooks/useTranslation
 *
 * @example
 * ```tsx
 * // With namespace (recommended for apps)
 * const { t } = useTranslation('calculator');
 * return <button>{t('clear')}</button>;
 *
 * // Access common strings
 * const { t } = useTranslation('common');
 * return <button>{t('actions.save')}</button>;
 *
 * // With interpolation
 * const { t } = useTranslation('todoList');
 * return <span>{t('remaining', { count: 5 })}</span>;
 * ```
 */
import { useMemo } from 'react';
import { useLocalization, TFunction } from '../context/LocalizationContext';

/**
 * Available translation namespaces
 */
export type TranslationNamespace =
    | 'common'
    | 'arcade'
    | 'base64Tool'
    | 'browser'
    | 'calculator'
    | 'calendar'
    | 'clock'
    | 'colorPicker'
    | 'gistExplorer'
    | 'hashGenerator'
    | 'idbExplorer'
    | 'imageViewer'
    | 'jsonViewer'
    | 'mail'
    | 'notepad'
    | 'passwordGenerator'
    | 'qrGenerator'
    | 'recycleBin'
    | 'settings'
    | 'spreadsheet'
    | 'systemInfo'
    | 'terminal'
    | 'thisPC'
    | 'timer'
    | 'todoList'
    | 'unitConverter'
    | 'wallpaperStudio'
    | 'weather'
    | 'wordCounter'
    | 'youtubePlayer'
    | 'fileExplorer';

interface UseTranslationResult {
    /** Translation function for the specified namespace */
    t: TFunction;
    /** Current locale (e.g., 'en-US') */
    locale: string;
}

/**
 * Hook to access translations for a specific namespace
 *
 * @param namespace - The namespace to use for translations (e.g., 'calculator', 'common')
 * @returns Translation function and locale
 */
export const useTranslation = (namespace: TranslationNamespace = 'common'): UseTranslationResult => {
    const { getTranslation, locale } = useLocalization();

    const t = useMemo(() => getTranslation(namespace as never), [getTranslation, namespace]);

    return { t, locale };
};

export type { TFunction };
