import { useEffect, useState } from 'react';

/**
 * Media query for detecting phone-sized viewports:
 * - Portrait: width < 768px
 * - Landscape: height <= 500px (catches phones rotated to landscape where width > 768px)
 *
 * Note: iPads in landscape have height > 500px so they won't trigger phone mode.
 */
const PHONE_MEDIA_QUERY = '(max-width: 767px), (max-height: 500px) and (orientation: landscape)';

/**
 * Hook that detects if the viewport is phone-sized.
 * Uses matchMedia for performance and consistency with CSS breakpoints.
 * Updates on resize and orientation change.
 *
 * Detection logic:
 * - Portrait phones: width < 768px
 * - Landscape phones: height <= 500px AND landscape orientation
 *   (e.g., iPhone in landscape is ~390x844 rotated to ~844x390)
 *
 * Note: Tablets (iPads) have height > 500px even in landscape, so they
 * render desktop UI as intended.
 *
 * @returns true when viewport is phone-sized (portrait or landscape)
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
        return window.matchMedia(PHONE_MEDIA_QUERY).matches;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia(PHONE_MEDIA_QUERY);

        const handleChange = () => {
            setIsPhone(mediaQuery.matches);
        };

        // Set initial value
        handleChange();

        // Listen for changes (resize, orientation change)
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
            return () => {
                mediaQuery.removeEventListener('change', handleChange);
            };
        }

        if (mediaQuery.addListener) {
            mediaQuery.addListener(handleChange);
            return () => {
                mediaQuery.removeListener(handleChange);
            };
        }
    }, []);

    return isPhone;
}
