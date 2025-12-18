/**
 * Tests for useDebounce hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';

describe('useDebounce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return the initial value immediately', () => {
        const { result } = renderHook(() => useDebounce('initial', 500));
        expect(result.current).toBe('initial');
    });

    it('should debounce value changes', () => {
        const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
            initialProps: { value: 'initial', delay: 500 },
        });

        expect(result.current).toBe('initial');

        // Update the value
        rerender({ value: 'updated', delay: 500 });

        // Value should not have changed yet
        expect(result.current).toBe('initial');

        // Fast-forward time
        act(() => {
            vi.advanceTimersByTime(500);
        });

        // Now the value should be updated
        expect(result.current).toBe('updated');
    });

    it('should reset timer on rapid value changes', () => {
        const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
            initialProps: { value: 'initial', delay: 500 },
        });

        // Rapid changes
        rerender({ value: 'change1', delay: 500 });
        act(() => {
            vi.advanceTimersByTime(200);
        });

        rerender({ value: 'change2', delay: 500 });
        act(() => {
            vi.advanceTimersByTime(200);
        });

        rerender({ value: 'change3', delay: 500 });

        // Value should still be initial (timer reset each time)
        expect(result.current).toBe('initial');

        // Wait full delay
        act(() => {
            vi.advanceTimersByTime(500);
        });

        // Should have the last value
        expect(result.current).toBe('change3');
    });

    it('should work with different types', () => {
        // Test with number
        const { result: numberResult } = renderHook(() => useDebounce(42, 100));
        expect(numberResult.current).toBe(42);

        // Test with object
        const obj = { foo: 'bar' };
        const { result: objectResult } = renderHook(() => useDebounce(obj, 100));
        expect(objectResult.current).toEqual({ foo: 'bar' });

        // Test with array
        const arr = [1, 2, 3];
        const { result: arrayResult } = renderHook(() => useDebounce(arr, 100));
        expect(arrayResult.current).toEqual([1, 2, 3]);
    });

    it('should handle zero delay', () => {
        const { result, rerender } = renderHook(({ value }) => useDebounce(value, 0), {
            initialProps: { value: 'initial' },
        });

        rerender({ value: 'updated' });

        act(() => {
            vi.advanceTimersByTime(0);
        });

        expect(result.current).toBe('updated');
    });
});
