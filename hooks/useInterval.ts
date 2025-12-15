/**
 * Hook for managing intervals with automatic cleanup
 * @module hooks/useInterval
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * A hook that manages a setInterval with automatic cleanup.
 * The interval is automatically cleared when the component unmounts or when
 * the delay changes. Pass `null` as delay to pause the interval.
 *
 * @param callback - Function to call on each interval tick
 * @param delay - Interval delay in milliseconds, or null to pause
 *
 * @example
 * ```tsx
 * // Basic timer that updates every second
 * const [count, setCount] = useState(0);
 * useInterval(() => setCount(c => c + 1), 1000);
 *
 * // Pausable timer
 * const [isRunning, setIsRunning] = useState(false);
 * useInterval(() => setTime(t => t + 10), isRunning ? 10 : null);
 * ```
 */
export function useInterval(callback: () => void, delay: number | null): void {
    const savedCallback = useRef(callback);

    // Remember the latest callback
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    // Set up the interval
    useEffect(() => {
        if (delay === null) {
            return;
        }

        const id = setInterval(() => savedCallback.current(), delay);

        return () => clearInterval(id);
    }, [delay]);
}

/**
 * A hook that provides more control over intervals, including
 * the ability to manually start, stop, and reset.
 *
 * @param callback - Function to call on each interval tick
 * @param delay - Interval delay in milliseconds
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * const { start, stop, isRunning } = useControllableInterval(
 *   () => setTime(t => t + 10),
 *   10,
 *   { autoStart: false }
 * );
 *
 * return (
 *   <button onClick={isRunning ? stop : start}>
 *     {isRunning ? 'Pause' : 'Start'}
 *   </button>
 * );
 * ```
 */
export function useControllableInterval(
    callback: () => void,
    delay: number,
    options: { autoStart?: boolean } = {}
): {
    start: () => void;
    stop: () => void;
    isRunning: boolean;
} {
    const { autoStart = false } = options;
    const savedCallback = useRef(callback);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isRunningRef = useRef(autoStart);

    // Remember the latest callback
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    const stop = useCallback(() => {
        if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        isRunningRef.current = false;
    }, []);

    const start = useCallback(() => {
        if (intervalRef.current !== null) {
            return; // Already running
        }
        isRunningRef.current = true;
        intervalRef.current = setInterval(() => savedCallback.current(), delay);
    }, [delay]);

    // Auto-start if configured
    useEffect(() => {
        if (autoStart) {
            start();
        }
        return stop;
    }, [autoStart, start, stop]);

    return {
        start,
        stop,
        isRunning: isRunningRef.current,
    };
}
