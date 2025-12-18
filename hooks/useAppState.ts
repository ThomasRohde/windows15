import { useCallback, useMemo } from 'react';
import { useDb } from '../context/DbContext';
import { useDexieLiveQuery } from '../utils/storage/react';

/**
 * useAppState - Persists small UI state for apps across sessions
 *
 * Similar to useState but persists to IndexedDB and syncs via Dexie Cloud.
 * Use for small UI state like selected tabs, view modes, filter settings.
 * Do NOT use for large data - use dedicated tables instead.
 *
 * @example
 * ```tsx
 * const [viewMode, setViewMode] = useAppState('calculator', { mode: 'basic' });
 * // viewMode persists across page reloads and syncs across devices
 * ```
 *
 * @param appId - Unique identifier for the app (e.g., 'calculator', 'weather')
 * @param defaultState - Default state when no persisted state exists
 * @returns Tuple of [state, setState] similar to useState
 */
export function useAppState<T>(appId: string, defaultState: T): [T, (newState: T | ((prev: T) => T)) => Promise<void>] {
    const db = useDb();

    // Live query for current state
    const { value: record } = useDexieLiveQuery(() => db.appState.get(appId), [db, appId]);

    // Parse stored state or use default
    const state = useMemo(() => {
        if (!record?.state) return defaultState;
        try {
            return JSON.parse(record.state) as T;
        } catch {
            return defaultState;
        }
    }, [record, defaultState]);

    // Setter function that persists to IndexedDB
    const setState = useCallback(
        async (newState: T | ((prev: T) => T)) => {
            const valueToStore = typeof newState === 'function' ? (newState as (prev: T) => T)(state) : newState;

            await db.appState.put({
                appId,
                state: JSON.stringify(valueToStore),
                updatedAt: Date.now(),
            });
        },
        [db, appId, state]
    );

    return [state, setState];
}

/**
 * useAppStateValue - Read-only access to app state (no setter)
 *
 * Useful when you only need to read state, not modify it.
 *
 * @param appId - Unique identifier for the app
 * @param defaultState - Default state when no persisted state exists
 * @returns The current state value
 */
export function useAppStateValue<T>(appId: string, defaultState: T): T {
    const db = useDb();

    const { value: record } = useDexieLiveQuery(() => db.appState.get(appId), [db, appId]);

    return useMemo(() => {
        if (!record?.state) return defaultState;
        try {
            return JSON.parse(record.state) as T;
        } catch {
            return defaultState;
        }
    }, [record, defaultState]);
}
