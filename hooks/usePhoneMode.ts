import { useEffect, useState } from 'react';

/**
 * Hook that detects if the viewport is phone-sized (< 768px).
 * Uses matchMedia for performance and consistency with CSS breakpoints.
 * Updates on resize and orientation change.
 *
 * @returns true when viewport width is less than 768px
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isPhone = usePhoneMode();
 *   return isPhone ? <MobileUI /> : <DesktopUI />;
 * }
 * ```
 */
export function usePhoneMode(): boolean {
    const [isPhone, setIsPhone] = useState(() => {
        // Default to false during SSR or initial render
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(max-width: 767px)').matches;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia('(max-width: 767px)');

        const handleChange = (e: { matches: boolean }) => {
            setIsPhone(e.matches);
        };

        // Set initial value
        handleChange(mediaQuery);

        // Listen for changes (resize, orientation change)
        mediaQuery.addEventListener('change', handleChange);

        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, []);

    return isPhone;
}
