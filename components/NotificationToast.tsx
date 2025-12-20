/**
 * NotificationToast (F103)
 *
 * A toast notification component that listens to the event bus
 * and displays brief notifications with auto-dismiss.
 */
import React, { useState, useCallback } from 'react';
import { useAppEvent, useOS } from '../hooks';

interface Notification {
    id: number;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    duration: number;
    appId?: string;
}

const NOTIFICATION_ICONS: Record<Notification['type'], string> = {
    info: 'info',
    success: 'check_circle',
    warning: 'warning',
    error: 'error',
};

const NOTIFICATION_COLORS: Record<Notification['type'], string> = {
    info: 'text-blue-400',
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
};

let notificationId = 0;

// Maximum number of notifications to display at once
const MAX_VISIBLE_NOTIFICATIONS = 5;

/**
 * Toast notification component that displays brief notifications
 * Listens to 'notification:show' events from the event bus
 */
export const NotificationToast: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const { openWindow } = useOS();

    const addNotification = useCallback(
        ({
            message,
            type,
            duration,
            appId,
        }: {
            message: string;
            type: Notification['type'];
            duration?: number;
            appId?: string;
        }) => {
            const id = ++notificationId;
            const notification: Notification = {
                id,
                message,
                type,
                duration: duration ?? 3000,
                appId,
            };

            setNotifications(prev => {
                // If at max capacity, remove the oldest notification
                const updated = prev.length >= MAX_VISIBLE_NOTIFICATIONS ? prev.slice(1) : prev;
                return [...updated, notification];
            });

            // Auto-dismiss
            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }, notification.duration);
        },
        []
    );

    // Listen for notification events
    useAppEvent('notification:show', addNotification);

    const handleNotificationClick = (notification: Notification) => {
        if (notification.appId) {
            openWindow(notification.appId);
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
        }
    };

    if (notifications.length === 0) return null;

    return (
        <div className="fixed bottom-20 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
            {notifications.map(notification => (
                <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`glass-panel rounded-xl shadow-2xl ring-1 ring-white/10 p-3 min-w-[200px] max-w-[320px] animate-fade-in-up pointer-events-auto ${notification.appId ? 'cursor-pointer hover:bg-white/5' : ''}`}
                >
                    <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined text-xl ${NOTIFICATION_COLORS[notification.type]}`}>
                            {NOTIFICATION_ICONS[notification.type]}
                        </span>
                        <p className="text-white text-sm flex-1">{notification.message}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default NotificationToast;
