import { useEffect, useState } from 'react';

/**
 * Orientation type for the device/viewport
 */
export type Orientation = 'portrait' | 'landscape';

/**
 * Hook that detects the current viewport orientation.
 * Uses matchMedia for performance and consistency.
 * Updates reactively on orientation change.
 *
 * @returns 'portrait' when height > width, 'landscape' when width >= height
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const orientation = useOrientation();
 *   return orientation === 'landscape' ? <LandscapeLayout /> : <PortraitLayout />;
 * }
 * ```
 */
export function useOrientation(): Orientation {
    const [orientation, setOrientation] = useState<Orientation>(() => {
        // Default to portrait during SSR or initial render
        if (typeof window === 'undefined') return 'portrait';
        return window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape';
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia('(orientation: portrait)');

        const handleChange = (e: { matches: boolean }) => {
            setOrientation(e.matches ? 'portrait' : 'landscape');
        };

        // Set initial value
        handleChange(mediaQuery);

        // Listen for changes
        mediaQuery.addEventListener('change', handleChange);

        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, []);

    return orientation;
}
