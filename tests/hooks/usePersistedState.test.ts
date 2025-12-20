/**
 * Tests for usePersistedState hook
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePersistedState } from '@/hooks/usePersistedState';
import { storageService } from '@/utils/storage';

describe('usePersistedState', () => {
    let store: Map<string, unknown>;
    let subscribers: Map<string, Set<(value: unknown | undefined) => void>>;

    const notify = (key: string) => {
        const handlers = subscribers.get(key);
        if (!handlers) return;
        const value = store.has(key) ? store.get(key) : undefined;
        handlers.forEach(handler => handler(value));
    };

    beforeEach(() => {
        store = new Map();
        subscribers = new Map();

        vi.spyOn(storageService, 'get').mockImplementation(async key => store.get(key) as unknown);
        vi.spyOn(storageService, 'set').mockImplementation(async (key, value) => {
            store.set(key, value);
            notify(key);
        });
        vi.spyOn(storageService, 'remove').mockImplementation(async key => {
            store.delete(key);
            notify(key);
        });
        vi.spyOn(storageService, 'subscribe').mockImplementation((key, handler) => {
            const set = subscribers.get(key) ?? new Set<(value: unknown | undefined) => void>();
            set.add(handler);
            subscribers.set(key, set);
            return () => {
                set.delete(handler);
                if (set.size === 0) {
                    subscribers.delete(key);
                }
            };
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('resets to default when the stored value is removed', async () => {
        const { result } = renderHook(() => usePersistedState('prefs.theme', 'light'));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        act(() => {
            result.current.setValue('dark');
        });

        expect(result.current.value).toBe('dark');

        await act(async () => {
            await storageService.remove('prefs.theme');
        });

        await waitFor(() => {
            expect(result.current.value).toBe('light');
        });
    });

    it('preserves explicit null values from storage', async () => {
        store.set('prefs.theme', null);

        const { result } = renderHook(() => usePersistedState('prefs.theme', 'light'));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.value).toBeNull();
    });
});
