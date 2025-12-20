/**
 * usePersistedState - Persist React state to Dexie (IndexedDB) with reactive updates
 *
 * This hook provides a unified way to persist component state with cloud sync support.
 * It's backed by Dexie's key-value store, which automatically syncs across tabs and devices.
 *
 * @template T - The type of the stored value
 * @param key - The storage key (should be unique across the app, use dot notation like 'app.feature')
 * @param defaultValue - The default value if no stored value exists
 * @returns A tuple of [value, setValue, { isLoading }] similar to useState
 *
 * @example
 * ```tsx
 * // Persist color palette
 * const [colors, setColors] = usePersistedState('colorpicker.saved', []);
 *
 * // Persist app settings with type safety
 * const [settings, setSettings] = usePersistedState<AppSettings>(
 *   'myapp.settings',
 *   { theme: 'dark', notifications: true }
 * );
 * ```
 *
 * When to use:
 * - User preferences that should persist across sessions
 * - App state that should sync across tabs/devices
 * - Data that doesn't need complex querying (use Dexie tables directly for that)
 *
 * When NOT to use:
 * - Temporary UI state (use useState)
 * - Frequently changing values (can cause excessive IndexedDB writes)
 * - Large objects (> 1MB) - consider breaking into smaller keys
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { storageService } from '../utils/storage';

export interface UsePersistedStateReturn<T> {
    value: T;
    setValue: (value: T | ((prev: T) => T)) => void;
    isLoading: boolean;
}

export function usePersistedState<T>(key: string, defaultValue: T): UsePersistedStateReturn<T> {
    const [value, setValueInternal] = useState<T>(defaultValue);
    const [isLoading, setIsLoading] = useState(true);
    const defaultValueRef = useRef(defaultValue);

    useEffect(() => {
        defaultValueRef.current = defaultValue;
    }, [defaultValue]);

    // Load initial value from storage
    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);

        const loadInitialValue = async () => {
            try {
                const stored = await storageService.get<T>(key);
                if (!cancelled) {
                    const nextValue = stored === undefined ? defaultValueRef.current : stored;
                    setValueInternal(nextValue);
                    setIsLoading(false);
                }
            } catch (error) {
                console.warn(`[usePersistedState] Error loading key "${key}":`, error);
                if (!cancelled) {
                    setValueInternal(defaultValueRef.current);
                    setIsLoading(false);
                }
            }
        };

        loadInitialValue();

        return () => {
            cancelled = true;
        };
    }, [key]);

    // Subscribe to changes (from other tabs/components)
    useEffect(() => {
        if (isLoading) return;

        const unsubscribe = storageService.subscribe<T>(key, newValue => {
            if (newValue === undefined) {
                setValueInternal(defaultValueRef.current);
                return;
            }
            setValueInternal(newValue);
        });

        return unsubscribe;
    }, [key, isLoading]);

    // Persist value to storage
    const setValue = useCallback(
        (valueOrUpdater: T | ((prev: T) => T)) => {
            setValueInternal(prev => {
                const newValue = valueOrUpdater instanceof Function ? valueOrUpdater(prev) : valueOrUpdater;

                // Persist asynchronously (don't block UI)
                storageService.set(key, newValue).catch(error => {
                    console.error(`[usePersistedState] Error saving key "${key}":`, error);
                });

                return newValue;
            });
        },
        [key]
    );

    return { value, setValue, isLoading };
}
