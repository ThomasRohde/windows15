/**
 * useNotification - Convenience hook for displaying toast notifications
 *
 * Provides ergonomic methods for showing notifications via the event bus.
 * Wraps the 'notification:show' event in a simple, type-safe API.
 * Also provides schedule() method for scheduled browser notifications (F157).
 *
 * @module hooks/useNotification
 * @see components/NotificationToast
 * @see context/NotificationContext
 */
import { useCallback } from 'react';
import { useAppEmit } from './useEventBus';
import { soundService } from '../utils';
import { useNotificationCenter } from '../context/NotificationContext';

export interface NotificationOptions {
    /**
     * Optional duration in milliseconds (default: 3000)
     */
    duration?: number;
}

export interface ScheduleNotificationOptions {
    /**
     * Notification type (default: 'info')
     */
    type?: 'success' | 'error' | 'warning' | 'info';
    /**
     * Source app ID
     */
    appId?: string;
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

    /**
     * Schedule a notification for a future time (F157)
     * Returns the notification ID for later cancellation
     * @param time - Date or Unix timestamp when to show the notification
     * @param title - Notification title
     * @param message - Notification body
     * @param options - Optional configuration
     */
    schedule: (
        time: Date | number,
        title: string,
        message: string,
        options?: ScheduleNotificationOptions
    ) => Promise<string>;
}

/**
 * Hook for displaying toast notifications
 *
 * @returns Object with success, error, info, warning, and schedule notification methods
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
 * // Schedule a notification for 5 minutes from now
 * const notify = useNotification();
 * const notifId = await notify.schedule(
 *   Date.now() + 5 * 60 * 1000,
 *   'Timer Complete',
 *   'Your timer has finished!',
 *   { type: 'success', appId: 'timer' }
 * );
 * ```
 */
export function useNotification(): UseNotificationReturn {
    const emit = useAppEmit('notification:show');
    const notificationCenter = useNotificationCenter();

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

    const schedule = useCallback(
        async (
            time: Date | number,
            title: string,
            message: string,
            options?: ScheduleNotificationOptions
        ): Promise<string> => {
            return notificationCenter.schedule(time, title, message, options);
        },
        [notificationCenter]
    );

    return { success, error, info, warning, schedule };
}
