import { useEffect, useRef } from 'react';
import { useNotificationCenter } from '../context/NotificationContext';
import { getViewportSize } from '../utils';

/**
 * GestureHandler component that detects edge swipes and triggers actions.
 * Currently supports:
 * - Right edge swipe -> Opens Notification Center (F222)
 *
 * @module components/GestureHandler
 */
export const GestureHandler: React.FC = () => {
    const { open: openNotifications } = useNotificationCenter();
    const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

    useEffect(() => {
        const EDGE_THRESHOLD = 20; // Pixels from edge to start detecting
        const SWIPE_MIN_DISTANCE = 50; // Minimum swipe distance
        const SWIPE_MAX_TIME = 300; // Maximum time for swipe (ms)
        const SWIPE_MAX_VERTICAL_DRIFT = 100; // Max vertical movement

        const handleTouchStart = (e: globalThis.TouchEvent) => {
            const touch = e.touches[0];
            const { width: screenWidth } = getViewportSize();

            // Detect if touch started from right edge
            if (touch.clientX > screenWidth - EDGE_THRESHOLD) {
                touchStartRef.current = {
                    x: touch.clientX,
                    y: touch.clientY,
                    time: Date.now(),
                };
            }
        };

        const handleTouchEnd = (e: globalThis.TouchEvent) => {
            if (!touchStartRef.current) return;

            const touch = e.changedTouches[0];
            const deltaX = touchStartRef.current.x - touch.clientX; // Swipe left is positive
            const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
            const deltaTime = Date.now() - touchStartRef.current.time;

            // Check if it's a valid swipe from right edge
            if (
                deltaX > SWIPE_MIN_DISTANCE && // Swiped left enough
                deltaY < SWIPE_MAX_VERTICAL_DRIFT && // Not too vertical
                deltaTime < SWIPE_MAX_TIME // Fast enough
            ) {
                openNotifications();
            }

            touchStartRef.current = null;
        };

        const handleTouchCancel = () => {
            touchStartRef.current = null;
        };

        // Add event listeners
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });
        document.addEventListener('touchcancel', handleTouchCancel);

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchend', handleTouchEnd);
            document.removeEventListener('touchcancel', handleTouchCancel);
        };
    }, [openNotifications]);

    // This component doesn't render anything
    return null;
};
