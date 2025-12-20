/**
 * useLocalStorage - Persist state to localStorage with automatic serialization
 *
 * @template T - The type of the stored value
 * @param key - The localStorage key
 * @param initialValue - The initial value if no stored value exists
 * @returns A tuple of [storedValue, setValue] similar to useState
 *
 * @example
 * ```tsx
 * const [theme, setTheme] = useLocalStorage('theme', 'dark');
 * const [settings, setSettings] = useLocalStorage<UserSettings>('settings', defaultSettings);
 * ```
 */
import { useState, useEffect, useCallback, useRef } from 'react';

const isTestEnv = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
    const initialValueRef = useRef(initialValue);

    useEffect(() => {
        initialValueRef.current = initialValue;
    }, [initialValue]);

    // Get initial value from localStorage or use provided initial value
    const readValue = useCallback((): T => {
        if (typeof window === 'undefined') {
            return initialValueRef.current;
        }

        try {
            const item = window.localStorage.getItem(key);
            return item ? (JSON.parse(item) as T) : initialValueRef.current;
        } catch (error) {
            if (!isTestEnv) {
                console.warn(`Error reading localStorage key "${key}":`, error);
            }
            return initialValueRef.current;
        }
    }, [key]);

    const [storedValue, setStoredValue] = useState<T>(readValue);

    useEffect(() => {
        setStoredValue(readValue());
    }, [readValue]);

    // Persist to localStorage whenever value changes
    const setValue = useCallback(
        (value: T | ((prev: T) => T)) => {
            setStoredValue(prev => {
                const valueToStore = value instanceof Function ? value(prev) : value;

                if (typeof window !== 'undefined') {
                    try {
                        window.localStorage.setItem(key, JSON.stringify(valueToStore));
                    } catch (error) {
                        if (!isTestEnv) {
                            console.warn(`Error setting localStorage key "${key}":`, error);
                        }
                    }
                }

                return valueToStore;
            });
        },
        [key]
    );

    // Listen for changes in other tabs/windows
    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key !== key) return;
            if (event.newValue === null) {
                setStoredValue(initialValueRef.current);
                return;
            }

            try {
                setStoredValue(JSON.parse(event.newValue) as T);
            } catch {
                // Ignore parse errors
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [key]);

    return [storedValue, setValue];
}
