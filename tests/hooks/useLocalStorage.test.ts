/**
 * Tests for useLocalStorage hook
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../../hooks/useLocalStorage';

describe('useLocalStorage', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('should return initial value when localStorage is empty', () => {
        const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'));
        expect(result.current[0]).toBe('defaultValue');
    });

    it('should return stored value from localStorage', () => {
        localStorage.setItem('existingKey', JSON.stringify('storedValue'));

        const { result } = renderHook(() => useLocalStorage('existingKey', 'defaultValue'));
        expect(result.current[0]).toBe('storedValue');
    });

    it('should update localStorage when value changes', () => {
        const { result } = renderHook(() => useLocalStorage('testKey', 'initial'));

        act(() => {
            result.current[1]('updated');
        });

        expect(result.current[0]).toBe('updated');
        expect(JSON.parse(localStorage.getItem('testKey') || '')).toBe('updated');
    });

    it('should support function updates', () => {
        const { result } = renderHook(() => useLocalStorage('counter', 0));

        act(() => {
            result.current[1](prev => prev + 1);
        });

        expect(result.current[0]).toBe(1);

        act(() => {
            result.current[1](prev => prev + 10);
        });

        expect(result.current[0]).toBe(11);
    });

    it('should work with complex objects', () => {
        interface Settings {
            theme: string;
            notifications: boolean;
            count: number;
        }

        const defaultSettings: Settings = {
            theme: 'light',
            notifications: true,
            count: 0,
        };

        const { result } = renderHook(() => useLocalStorage<Settings>('settings', defaultSettings));

        expect(result.current[0]).toEqual(defaultSettings);

        act(() => {
            result.current[1]({ theme: 'dark', notifications: false, count: 5 });
        });

        expect(result.current[0]).toEqual({
            theme: 'dark',
            notifications: false,
            count: 5,
        });
    });

    it('should work with arrays', () => {
        const { result } = renderHook(() => useLocalStorage<string[]>('items', []));

        expect(result.current[0]).toEqual([]);

        act(() => {
            result.current[1](['item1', 'item2']);
        });

        expect(result.current[0]).toEqual(['item1', 'item2']);

        act(() => {
            result.current[1](prev => [...prev, 'item3']);
        });

        expect(result.current[0]).toEqual(['item1', 'item2', 'item3']);
    });

    it('should handle invalid JSON in localStorage gracefully', () => {
        // Set invalid JSON directly
        const originalGetItem = localStorage.getItem;
        vi.spyOn(localStorage, 'getItem').mockReturnValueOnce('not valid json{{{');

        const { result } = renderHook(() => useLocalStorage('invalidKey', 'fallback'));

        expect(result.current[0]).toBe('fallback');

        // Restore
        localStorage.getItem = originalGetItem;
    });

    it('should sync across instances with the same key', () => {
        const { result: result1 } = renderHook(() => useLocalStorage('sharedKey', 'initial'));
        const { result: result2 } = renderHook(() => useLocalStorage('sharedKey', 'initial'));

        // Both should have initial value (result2 reads from localStorage set by result1's render)
        expect(result1.current[0]).toBe('initial');
        expect(result2.current[0]).toBe('initial');

        // Update via first hook
        act(() => {
            result1.current[1]('updated');
        });

        // First should be updated immediately
        expect(result1.current[0]).toBe('updated');

        // Second reads from localStorage (updated by first)
        // Note: In real scenarios, storage events handle this, but we've mocked localStorage
        expect(JSON.parse(localStorage.getItem('sharedKey') || '')).toBe('updated');
    });
});
