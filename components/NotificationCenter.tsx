/**
 * NotificationCenter - Dropdown panel showing notification history (F157)
 *
 * Displays recent notifications with read/unread state, action buttons,
 * and permission request UI.
 *
 * @module components/NotificationCenter
 */
import React, { useEffect, useRef, memo } from 'react';
import { useNotificationCenter } from '../context/NotificationContext';
import { formatRelativeTime } from '../utils/timeFormatters';

// ==========================================
// Types
// ==========================================

interface NotificationItemProps {
    id: string;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    isRead: boolean;
    createdAt: number;
    appId?: string;
    onMarkAsRead: (id: string) => void;
    onDismiss: (id: string) => void;
}

// ==========================================
// NotificationItem Component
// ==========================================

const NotificationItem = memo<NotificationItemProps>(function NotificationItem({
    id,
    title,
    message,
    type,
    isRead,
    createdAt,
    onMarkAsRead,
    onDismiss,
}) {
    const typeConfig = {
        success: { icon: 'check_circle', color: 'text-green-400', bgHover: 'hover:bg-green-500/10' },
        error: { icon: 'error', color: 'text-red-400', bgHover: 'hover:bg-red-500/10' },
        warning: { icon: 'warning', color: 'text-yellow-400', bgHover: 'hover:bg-yellow-500/10' },
        info: { icon: 'info', color: 'text-blue-400', bgHover: 'hover:bg-blue-500/10' },
    };

    const config = typeConfig[type];
    const timeAgo = formatRelativeTime(createdAt);

    return (
        <div
            className={`relative p-3 border-b border-white/5 last:border-b-0 transition-colors ${config.bgHover} ${!isRead ? 'bg-white/5' : ''}`}
        >
            {/* Unread indicator */}
            {!isRead && <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500" />}

            <div className="flex gap-3 pl-3">
                {/* Type icon */}
                <span
                    className={`material-symbols-outlined text-[20px] ${config.color} mt-0.5 shrink-0`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                >
                    {config.icon}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-sm text-white truncate">{title}</h4>
                        <span className="text-[10px] text-white/40 shrink-0">{timeAgo}</span>
                    </div>
                    <p className="text-xs text-white/60 mt-0.5 line-clamp-2">{message}</p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 shrink-0">
                    {!isRead && (
                        <button
                            onClick={() => onMarkAsRead(id)}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                            title="Mark as read"
                        >
                            <span className="material-symbols-outlined text-[16px] text-white/60">mark_email_read</span>
                        </button>
                    )}
                    <button
                        onClick={() => onDismiss(id)}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                        title="Dismiss"
                    >
                        <span className="material-symbols-outlined text-[16px] text-white/60">close</span>
                    </button>
                </div>
            </div>
        </div>
    );
});

// ==========================================
// Main NotificationCenter Component
// ==========================================

export const NotificationCenter: React.FC = () => {
    const {
        notifications,
        unreadCount,
        isOpen,
        close,
        permission,
        requestPermission,
        markAsRead,
        markAllAsRead,
        dismiss,
        clearAll,
    } = useNotificationCenter();

    const panelRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                // Check if click is on the notification button (to allow toggle)
                const target = e.target as HTMLElement;
                if (target.closest('[data-notification-button]')) return;
                close();
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, close]);

    if (!isOpen) return null;

    const showPermissionBanner = permission === 'default';

    return (
        <div
            ref={panelRef}
            className="fixed bottom-20 right-8 w-96 max-h-[70vh] bg-[#1a1a1a]/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 flex flex-col z-[9999] animate-in slide-in-from-bottom-4 fade-in duration-200"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-white">notifications</span>
                    <h3 className="font-semibold text-white">Notifications</h3>
                    {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500 text-white rounded-full">
                            {unreadCount}
                        </span>
                    )}
                </div>
                <div className="flex gap-1">
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="px-2 py-1 text-xs text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
                        >
                            Mark all read
                        </button>
                    )}
                    {notifications.length > 0 && (
                        <button
                            onClick={clearAll}
                            className="px-2 py-1 text-xs text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
                        >
                            Clear all
                        </button>
                    )}
                </div>
            </div>

            {/* Permission banner */}
            {showPermissionBanner && (
                <div className="px-4 py-3 bg-blue-500/10 border-b border-white/10 flex items-center gap-3">
                    <span className="material-symbols-outlined text-blue-400">notifications_active</span>
                    <div className="flex-1">
                        <p className="text-sm text-white">Enable browser notifications</p>
                        <p className="text-xs text-white/60">Get alerts even when the app isn't focused</p>
                    </div>
                    <button
                        onClick={requestPermission}
                        className="px-3 py-1.5 text-sm font-medium bg-blue-500 hover:bg-blue-400 text-white rounded-lg transition-colors"
                    >
                        Enable
                    </button>
                </div>
            )}

            {/* Notifications list */}
            <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-white/40">
                        <span className="material-symbols-outlined text-[48px] mb-3">notifications_off</span>
                        <p className="text-sm">No notifications</p>
                        <p className="text-xs mt-1">You're all caught up!</p>
                    </div>
                ) : (
                    notifications.map(notification => (
                        <NotificationItem
                            key={notification.id}
                            id={notification.id}
                            title={notification.title}
                            message={notification.message}
                            type={notification.type}
                            isRead={notification.isRead}
                            createdAt={notification.createdAt}
                            appId={notification.appId}
                            onMarkAsRead={markAsRead}
                            onDismiss={dismiss}
                        />
                    ))
                )}
            </div>

            {/* Footer */}
            {permission === 'denied' && (
                <div className="px-4 py-2 bg-red-500/10 border-t border-white/10 text-xs text-red-400 text-center">
                    Browser notifications are blocked. Enable them in browser settings.
                </div>
            )}
        </div>
    );
};
