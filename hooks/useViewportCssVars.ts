import { useEffect } from 'react';
import { getViewportSize } from '../utils';

/**
 * Keeps CSS viewport variables in sync with the actual visual viewport.
 * This stabilizes layout on mobile where 100vh can include browser UI.
 */
export const useViewportCssVars = (): void => {
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const root = document.documentElement;
        let rafId: number | null = null;

        const apply = () => {
            const { width, height } = getViewportSize();
            root.style.setProperty('--app-vw', `${Math.round(width)}px`);
            root.style.setProperty('--app-vh', `${Math.round(height)}px`);
        };

        const scheduleApply = () => {
            if (rafId !== null) return;
            rafId = window.requestAnimationFrame(() => {
                rafId = null;
                apply();
            });
        };

        apply();

        window.addEventListener('resize', scheduleApply);
        window.addEventListener('orientationchange', scheduleApply);

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', scheduleApply);
            window.visualViewport.addEventListener('scroll', scheduleApply);
        }

        return () => {
            if (rafId !== null) {
                window.cancelAnimationFrame(rafId);
            }
            window.removeEventListener('resize', scheduleApply);
            window.removeEventListener('orientationchange', scheduleApply);
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', scheduleApply);
                window.visualViewport.removeEventListener('scroll', scheduleApply);
            }
        };
    }, []);
};
