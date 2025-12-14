/**
 * NotificationToast (F103)
 *
 * A toast notification component that listens to the event bus
 * and displays brief notifications with auto-dismiss.
 */
import React, { useState, useCallback } from 'react';
import { useAppEvent } from '../hooks/useEventBus';

interface Notification {
    id: number;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    duration: number;
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

/**
 * Toast notification component that displays brief notifications
 * Listens to 'notification:show' events from the event bus
 */
export const NotificationToast: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const addNotification = useCallback(
        ({ message, type, duration }: { message: string; type: Notification['type']; duration?: number }) => {
            const id = ++notificationId;
            const notification: Notification = {
                id,
                message,
                type,
                duration: duration ?? 3000,
            };

            setNotifications(prev => [...prev, notification]);

            // Auto-dismiss
            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }, notification.duration);
        },
        []
    );

    // Listen for notification events
    useAppEvent('notification:show', addNotification);

    if (notifications.length === 0) return null;

    return (
        <div className="fixed bottom-20 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
            {notifications.map(notification => (
                <div
                    key={notification.id}
                    className="glass-panel rounded-xl shadow-2xl ring-1 ring-white/10 p-3 min-w-[200px] max-w-[320px] animate-fade-in-up pointer-events-auto"
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
