import { useEffect, useRef, useCallback } from 'react';

interface PinchGestureOptions {
    /** Callback when pinch starts */
    onPinchStart?: () => void;
    /** Callback during pinch with scale factor (1.0 = no change, > 1 = zoom in, < 1 = zoom out) */
    onPinch?: (scale: number, center: { x: number; y: number }) => void;
    /** Callback when pinch ends with final scale */
    onPinchEnd?: (scale: number) => void;
    /** Minimum scale change to trigger callbacks (default: 0.01) */
    threshold?: number;
    /** Enable/disable the gesture (default: true) */
    enabled?: boolean;
}

interface TouchPoint {
    id: number;
    x: number;
    y: number;
}

/**
 * Hook to handle pinch-to-zoom gestures on touch devices.
 * Tracks two touch points and calculates the scale factor based on the distance between them.
 *
 * @param ref - React ref to the element to attach the gesture to
 * @param options - Configuration options for the pinch gesture
 *
 * @example
 * ```tsx
 * const elementRef = useRef<HTMLDivElement>(null);
 * usePinchGesture(elementRef, {
 *   onPinch: (scale, center) => {
 *     console.log(`Pinch scale: ${scale}, center:`, center);
 *   }
 * });
 * ```
 */
export const usePinchGesture = <T extends HTMLElement>(
    ref: React.RefObject<T>,
    options: PinchGestureOptions = {}
): void => {
    const { onPinchStart, onPinch, onPinchEnd, threshold = 0.01, enabled = true } = options;

    const touchesRef = useRef<Map<number, TouchPoint>>(new Map());
    const initialDistanceRef = useRef<number>(0);
    const isPinchingRef = useRef<boolean>(false);
    const lastScaleRef = useRef<number>(1);

    const getDistance = useCallback((t1: TouchPoint, t2: TouchPoint): number => {
        const dx = t2.x - t1.x;
        const dy = t2.y - t1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }, []);

    const getCenter = useCallback((t1: TouchPoint, t2: TouchPoint): { x: number; y: number } => {
        return {
            x: (t1.x + t2.x) / 2,
            y: (t1.y + t2.y) / 2,
        };
    }, []);

    const handleTouchStart = useCallback(
        (e: globalThis.TouchEvent) => {
            if (!enabled) return;

            // Add new touches to our tracking map
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                touchesRef.current.set(touch.identifier, {
                    id: touch.identifier,
                    x: touch.clientX,
                    y: touch.clientY,
                });
            }

            // If we now have exactly 2 touches, start pinch gesture
            if (touchesRef.current.size === 2) {
                const touches = Array.from(touchesRef.current.values());
                initialDistanceRef.current = getDistance(touches[0], touches[1]);
                lastScaleRef.current = 1;
                isPinchingRef.current = true;
                onPinchStart?.();
            }
        },
        [enabled, getDistance, onPinchStart]
    );

    const handleTouchMove = useCallback(
        (e: globalThis.TouchEvent) => {
            if (!enabled || !isPinchingRef.current) return;

            // Update touch positions
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const existing = touchesRef.current.get(touch.identifier);
                if (existing) {
                    touchesRef.current.set(touch.identifier, {
                        id: touch.identifier,
                        x: touch.clientX,
                        y: touch.clientY,
                    });
                }
            }

            // Calculate current scale if we still have 2 touches
            if (touchesRef.current.size === 2) {
                const touches = Array.from(touchesRef.current.values());
                const currentDistance = getDistance(touches[0], touches[1]);
                const scale = currentDistance / initialDistanceRef.current;

                // Only trigger callback if change exceeds threshold
                if (Math.abs(scale - lastScaleRef.current) > threshold) {
                    const center = getCenter(touches[0], touches[1]);
                    onPinch?.(scale, center);
                    lastScaleRef.current = scale;
                    e.preventDefault(); // Prevent default zoom behavior
                }
            }
        },
        [enabled, getDistance, getCenter, onPinch, threshold]
    );

    const handleTouchEnd = useCallback(
        (e: globalThis.TouchEvent) => {
            if (!enabled) return;

            // Remove ended touches from tracking
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                touchesRef.current.delete(touch.identifier);
            }

            // If pinching and we no longer have 2 touches, end the gesture
            if (isPinchingRef.current && touchesRef.current.size < 2) {
                onPinchEnd?.(lastScaleRef.current);
                isPinchingRef.current = false;
                initialDistanceRef.current = 0;
                lastScaleRef.current = 1;
            }
        },
        [enabled, onPinchEnd]
    );

    useEffect(() => {
        const element = ref.current;
        if (!element || !enabled) return;

        // Add event listeners with passive: false to allow preventDefault
        element.addEventListener('touchstart', handleTouchStart, { passive: false });
        element.addEventListener('touchmove', handleTouchMove, { passive: false });
        element.addEventListener('touchend', handleTouchEnd);
        element.addEventListener('touchcancel', handleTouchEnd);

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
            element.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd, ref]);
};
