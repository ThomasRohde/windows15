/**
 * useNotification - Convenience hook for displaying toast notifications
 *
 * Provides ergonomic methods for showing notifications via the event bus.
 * Wraps the 'notification:show' event in a simple, type-safe API.
 *
 * @module hooks/useNotification
 * @see components/NotificationToast
 */
import { useCallback } from 'react';
import { useAppEmit } from './useEventBus';
import { soundService } from '../utils';

export interface NotificationOptions {
    /**
     * Optional duration in milliseconds (default: 3000)
     */
    duration?: number;
}

export interface UseNotificationReturn {
    /**
     * Show a success notification (green checkmark)
     * @param message - Message to display
     * @param options - Optional configuration
     */
    success: (message: string, options?: NotificationOptions) => void;

    /**
     * Show an error notification (red error icon)
     * @param message - Message to display
     * @param options - Optional configuration
     */
    error: (message: string, options?: NotificationOptions) => void;

    /**
     * Show an info notification (blue info icon)
     * @param message - Message to display
     * @param options - Optional configuration
     */
    info: (message: string, options?: NotificationOptions) => void;

    /**
     * Show a warning notification (yellow warning icon)
     * @param message - Message to display
     * @param options - Optional configuration
     */
    warning: (message: string, options?: NotificationOptions) => void;
}

/**
 * Hook for displaying toast notifications
 *
 * @returns Object with success, error, info, and warning notification methods
 *
 * @example
 * ```tsx
 * function SaveButton() {
 *   const notify = useNotification();
 *
 *   const handleSave = async () => {
 *     try {
 *       await saveData();
 *       notify.success('File saved successfully!');
 *     } catch (err) {
 *       notify.error('Failed to save file');
 *     }
 *   };
 *
 *   return <button onClick={handleSave}>Save</button>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With custom duration
 * const notify = useNotification();
 * notify.info('Processing...', { duration: 5000 });
 * ```
 */
export function useNotification(): UseNotificationReturn {
    const emit = useAppEmit('notification:show');

    const success = useCallback(
        (message: string, options?: NotificationOptions) => {
            soundService.play('success');
            emit({ message, type: 'success', duration: options?.duration });
        },
        [emit]
    );

    const error = useCallback(
        (message: string, options?: NotificationOptions) => {
            soundService.play('error');
            emit({ message, type: 'error', duration: options?.duration });
        },
        [emit]
    );

    const info = useCallback(
        (message: string, options?: NotificationOptions) => {
            soundService.play('notification');
            emit({ message, type: 'info', duration: options?.duration });
        },
        [emit]
    );

    const warning = useCallback(
        (message: string, options?: NotificationOptions) => {
            soundService.play('notification');
            emit({ message, type: 'warning', duration: options?.duration });
        },
        [emit]
    );

    return { success, error, info, warning };
}
