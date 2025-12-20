import { useState, useEffect } from 'react';

/**
 * Hook to detect if the device has touch capability.
 * Uses the `(pointer: coarse)` media query which indicates a primary input device
 * with limited precision (typically a touchscreen).
 *
 * @returns boolean indicating if the device is a touch device
 *
 * @example
 * ```tsx
 * const isTouchDevice = useTouchDevice();
 * return <button className={isTouchDevice ? 'p-4' : 'p-2'}>Click</button>;
 * ```
 */
export const useTouchDevice = (): boolean => {
    const [isTouchDevice, setIsTouchDevice] = useState<boolean>(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return false;
        return window.matchMedia('(pointer: coarse)').matches;
    });

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;

        const mediaQuery = window.matchMedia('(pointer: coarse)');

        const handleChange = (e: globalThis.MediaQueryListEvent) => {
            setIsTouchDevice(e.matches);
        };

        // Modern browsers
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
        // Legacy browsers
        else if (mediaQuery.addListener) {
            mediaQuery.addListener(handleChange);
            return () => mediaQuery.removeListener(handleChange);
        }
    }, []);

    return isTouchDevice;
};
