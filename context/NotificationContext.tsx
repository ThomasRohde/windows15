/**
 * NotificationContext - Centralized notification management (F157)
 *
 * Provides:
 * - Notification history persistence in DbContext
 * - Web Notifications API integration with permission management
 * - Scheduled notifications via setTimeout
 * - Notification center state management
 *
 * @module context/NotificationContext
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from './DbContext';
import { NotificationRecord } from '../utils/storage/db';
import { generateUuid } from '../utils';
import { soundService } from '../utils';

// ==========================================
// Types
// ==========================================

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

// Re-export browser types for convenience
export type BrowserNotificationPermission = 'default' | 'denied' | 'granted';

export interface ScheduleOptions {
    /** Notification type (default: 'info') */
    type?: NotificationType;
    /** Source app ID */
    appId?: string;
    /** Whether to show a browser notification (default: true) */
    showBrowserNotification?: boolean;
}

export interface NotificationContextValue {
    /** All notifications from the database */
    notifications: NotificationRecord[];
    /** Count of unread notifications */
    unreadCount: number;
    /** Whether the notification center is open */
    isOpen: boolean;
    /** Toggle the notification center */
    toggle: () => void;
    /** Open the notification center */
    open: () => void;
    /** Close the notification center */
    close: () => void;
    /** Current browser notification permission status */
    permission: BrowserNotificationPermission;
    /** Request browser notification permission */
    requestPermission: () => Promise<BrowserNotificationPermission>;
    /** Schedule a notification for a future time */
    schedule: (time: Date | number, title: string, message: string, options?: ScheduleOptions) => Promise<string>;
    /** Show an immediate notification */
    notify: (title: string, message: string, options?: ScheduleOptions) => Promise<string>;
    /** Mark a notification as read */
    markAsRead: (id: string) => Promise<void>;
    /** Mark all notifications as read */
    markAllAsRead: () => Promise<void>;
    /** Dismiss (delete) a notification */
    dismiss: (id: string) => Promise<void>;
    /** Clear all notifications */
    clearAll: () => Promise<void>;
}

// ==========================================
// Context
// ==========================================

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

// ==========================================
// Provider
// ==========================================

export interface NotificationProviderProps {
    children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
    const db = useDb();
    const [isOpen, setIsOpen] = useState(false);
    const [permission, setPermission] = useState<BrowserNotificationPermission>('default');
    const scheduledTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    // Live query for notifications (sorted by createdAt descending, limit 50)
    const notifications = useLiveQuery(
        async () => {
            return db.notifications.orderBy('createdAt').reverse().limit(50).toArray();
        },
        [db],
        []
    );

    // Calculate unread count
    const unreadCount = notifications?.filter(n => !n.isRead).length ?? 0;

    // Initialize permission state
    useEffect(() => {
        if ('Notification' in window) {
            setPermission(window.Notification.permission as BrowserNotificationPermission);
        }
    }, []);

    // Trigger a scheduled notification
    const triggerNotification = useCallback(
        async (notification: NotificationRecord) => {
            const triggeredAt = Date.now();

            const updatedCount = await db.notifications
                .where('id')
                .equals(notification.id)
                .and(n => !n.triggeredAt)
                .modify({ triggeredAt });

            if (updatedCount === 0) {
                scheduledTimersRef.current.delete(notification.id);
                return;
            }

            const latest = await db.notifications.get(notification.id);
            if (!latest) {
                scheduledTimersRef.current.delete(notification.id);
                return;
            }

            // Play sound
            soundService.play('notification');

            // Show browser notification if permission granted and allowed
            if (
                latest.showBrowserNotification !== false &&
                'Notification' in window &&
                window.Notification.permission === 'granted'
            ) {
                const browserNotif = new window.Notification(latest.title, {
                    body: latest.message,
                    icon: '/icon-192.png',
                    tag: latest.id,
                });

                // Close after 5 seconds
                setTimeout(() => browserNotif.close(), 5000);
            }

            // Remove from scheduled timers
            scheduledTimersRef.current.delete(notification.id);
        },
        [db]
    );

    // On mount, check for any scheduled notifications and set up timers
    useEffect(() => {
        const timers = scheduledTimersRef.current;
        const setupScheduledNotifications = async () => {
            const now = Date.now();
            const scheduled = await db.notifications.where('scheduledFor').above(0).toArray();

            for (const notification of scheduled) {
                if (!notification.scheduledFor || notification.triggeredAt) continue;

                const delay = notification.scheduledFor - now;
                if (delay <= 0) {
                    void triggerNotification(notification);
                    continue;
                }

                if (timers.has(notification.id)) continue;
                const timerId = setTimeout(() => {
                    void triggerNotification(notification);
                }, delay);
                timers.set(notification.id, timerId);
            }
        };

        void setupScheduledNotifications();

        // Cleanup timers on unmount
        return () => {
            timers.forEach(timerId => clearTimeout(timerId));
            timers.clear();
        };
    }, [db, triggerNotification]);

    // Keep scheduled timers in sync with database changes (other tabs/cloud sync)
    useEffect(() => {
        if (!notifications) return;

        const timers = scheduledTimersRef.current;
        const pendingIds = new Set(
            notifications.filter(notification => notification.scheduledFor && !notification.triggeredAt).map(n => n.id)
        );

        timers.forEach((timerId, id) => {
            if (!pendingIds.has(id)) {
                clearTimeout(timerId);
                timers.delete(id);
            }
        });

        const now = Date.now();
        for (const notification of notifications) {
            if (!notification.scheduledFor || notification.triggeredAt) continue;
            if (timers.has(notification.id)) continue;

            const delay = notification.scheduledFor - now;
            if (delay <= 0) {
                void triggerNotification(notification);
                continue;
            }

            const timerId = setTimeout(() => {
                void triggerNotification(notification);
            }, delay);
            timers.set(notification.id, timerId);
        }
    }, [notifications, triggerNotification]);

    // Request browser notification permission
    const requestPermission = useCallback(async (): Promise<BrowserNotificationPermission> => {
        if (!('Notification' in window)) {
            return 'denied';
        }

        const result = await window.Notification.requestPermission();
        setPermission(result as BrowserNotificationPermission);
        return result as BrowserNotificationPermission;
    }, []);

    // Schedule a notification for a future time
    const schedule = useCallback(
        async (time: Date | number, title: string, message: string, options: ScheduleOptions = {}): Promise<string> => {
            const scheduledFor = typeof time === 'number' ? time : time.getTime();
            const now = Date.now();
            const id = generateUuid();

            const notification: NotificationRecord = {
                id,
                title,
                message,
                type: options.type ?? 'info',
                appId: options.appId,
                showBrowserNotification: options.showBrowserNotification ?? true,
                isRead: false,
                scheduledFor,
                createdAt: now,
            };

            await db.notifications.add(notification);

            // Set up timer if the scheduled time is in the future
            const delay = scheduledFor - now;
            if (delay > 0) {
                const timerId = setTimeout(() => {
                    void triggerNotification(notification);
                }, delay);
                scheduledTimersRef.current.set(id, timerId);
            } else {
                // If scheduled time is in the past, trigger immediately
                void triggerNotification(notification);
            }

            return id;
        },
        [db, triggerNotification]
    );

    // Show an immediate notification
    const notify = useCallback(
        async (title: string, message: string, options: ScheduleOptions = {}): Promise<string> => {
            const now = Date.now();
            const id = generateUuid();

            const notification: NotificationRecord = {
                id,
                title,
                message,
                type: options.type ?? 'info',
                appId: options.appId,
                showBrowserNotification: options.showBrowserNotification ?? true,
                isRead: false,
                triggeredAt: now,
                createdAt: now,
            };

            await db.notifications.add(notification);

            // Play sound
            soundService.play('notification');

            // Show browser notification if enabled and permission granted
            if (options.showBrowserNotification !== false) {
                if ('Notification' in window && window.Notification.permission === 'granted') {
                    const browserNotif = new window.Notification(title, {
                        body: message,
                        icon: '/icon-192.png',
                        tag: id,
                    });
                    setTimeout(() => browserNotif.close(), 5000);
                }
            }

            return id;
        },
        [db]
    );

    // Mark a notification as read
    const markAsRead = useCallback(
        async (id: string): Promise<void> => {
            await db.notifications.update(id, { isRead: true });
        },
        [db]
    );

    // Mark all notifications as read
    const markAllAsRead = useCallback(async (): Promise<void> => {
        const unread = await db.notifications.where('isRead').equals(false).toArray();
        await Promise.all(unread.map(n => db.notifications.update(n.id, { isRead: true })));
    }, [db]);

    // Dismiss (delete) a notification
    const dismiss = useCallback(
        async (id: string): Promise<void> => {
            // Cancel any scheduled timer
            const timerId = scheduledTimersRef.current.get(id);
            if (timerId) {
                clearTimeout(timerId);
                scheduledTimersRef.current.delete(id);
            }
            await db.notifications.delete(id);
        },
        [db]
    );

    // Clear all notifications
    const clearAll = useCallback(async (): Promise<void> => {
        // Cancel all scheduled timers
        scheduledTimersRef.current.forEach(timerId => clearTimeout(timerId));
        scheduledTimersRef.current.clear();
        await db.notifications.clear();
    }, [db]);

    // Toggle, open, close handlers
    const toggle = useCallback(() => setIsOpen(prev => !prev), []);
    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);

    const value: NotificationContextValue = {
        notifications: notifications ?? [],
        unreadCount,
        isOpen,
        toggle,
        open,
        close,
        permission,
        requestPermission,
        schedule,
        notify,
        markAsRead,
        markAllAsRead,
        dismiss,
        clearAll,
    };

    return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

// ==========================================
// Hook
// ==========================================

/**
 * Hook to access the notification context
 *
 * @throws Error if used outside of NotificationProvider
 * @returns The NotificationContextValue
 *
 * @example
 * ```tsx
 * const { schedule, notify, unreadCount } = useNotificationCenter();
 *
 * // Schedule a notification for 5 minutes from now
 * await schedule(Date.now() + 5 * 60 * 1000, 'Reminder', 'Time to take a break!');
 *
 * // Show immediate notification
 * await notify('Success', 'File saved successfully', { type: 'success' });
 * ```
 */
export const useNotificationCenter = (): NotificationContextValue => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotificationCenter must be used within a NotificationProvider');
    }
    return context;
};
