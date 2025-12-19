import React, { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { useLocalization, useOS, useNotificationCenter } from '../context';
import { SyncStatus } from './SyncStatus';
import { NotificationCenter } from './NotificationCenter';
import { Tooltip } from './ui';

// Pinned apps configuration - static list
const PINNED_APPS = ['explorer', 'browser', 'mail', 'calendar', 'notepad', 'calculator', 'settings'] as const;

export const Taskbar = () => {
    const { toggleStartMenu, isStartMenuOpen, apps, openWindow, windows, minimizeWindow } = useOS();
    const { formatTimeShort, formatDateShort } = useLocalization();
    const { toggle: toggleNotifications, unreadCount, isOpen: isNotificationCenterOpen } = useNotificationCenter();
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Memoize click handlers to prevent TaskbarIcon re-renders
    const openWindowHandlers = useMemo(() => {
        const handlers: Record<string, () => void> = {};
        PINNED_APPS.forEach(id => {
            handlers[id] = () => openWindow(id);
        });
        return handlers;
    }, [openWindow]);

    // Memoize minimize all handler
    const handleMinimizeAll = useCallback(() => {
        if (windows.length === 0) return;
        const allMinimized = windows.every(w => w.isMinimized);
        windows.forEach(w => {
            if (allMinimized ? w.isMinimized : !w.isMinimized) {
                minimizeWindow(w.id);
            }
        });
    }, [windows, minimizeWindow]);

    return (
        <div data-taskbar className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
            <div className="flex items-center h-16 px-3 glass-panel rounded-full shadow-2xl ring-1 ring-white/10 gap-2 md:gap-4 transition-all">
                {/* Start Button */}
                <Tooltip content="Start Menu" position="top">
                    <button
                        data-testid="start-menu-button"
                        onClick={toggleStartMenu}
                        className={`w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all active:scale-95 group relative ml-1 ${isStartMenuOpen ? 'bg-white/10' : ''}`}
                    >
                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <span
                            className="material-symbols-outlined text-primary text-3xl relative z-10"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                            grid_view
                        </span>
                    </button>
                </Tooltip>

                <div className="w-px h-8 bg-white/10 mx-1"></div>

                {/* App Icons (Pinned + Open) */}
                <div className="flex gap-1 md:gap-2">
                    {/* Render Pinned Apps */}
                    {PINNED_APPS.map(id => {
                        const app = apps.find(a => a.id === id);
                        if (!app) return null;
                        const appWindow = windows.find(w => w.appId === id);
                        const isOpen = appWindow && !appWindow.isMinimized;
                        const isRunning = !!appWindow;
                        // Get badge count from the window state (F148)
                        const badge = appWindow?.badge ?? null;

                        return (
                            <TaskbarIcon
                                key={id}
                                icon={appWindow?.dynamicIcon ?? app.icon}
                                title={appWindow?.dynamicTitle ?? app.title}
                                colorClass={app.color.replace('bg-', 'text-')}
                                active={isOpen}
                                running={isRunning}
                                onClick={openWindowHandlers[id]}
                                filled={true}
                                badge={badge}
                            />
                        );
                    })}
                </div>

                <div className="w-px h-8 bg-white/10 mx-1"></div>

                {/* System Tray */}
                <div className="flex items-center gap-1 md:gap-2 mr-1">
                    <Tooltip content="Show hidden icons" position="top">
                        <button className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-[18px]">expand_less</span>
                        </button>
                    </Tooltip>
                    <Tooltip content="Network, Sound, Battery" position="top">
                        <div className="flex items-center gap-3 px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer group">
                            <span className="material-symbols-outlined text-[18px] text-white">wifi</span>
                            <span className="material-symbols-outlined text-[18px] text-white">volume_up</span>
                            <span className="material-symbols-outlined text-[18px] text-white">battery_full</span>
                        </div>
                    </Tooltip>
                    <SyncStatus />
                    {/* Notification Center (F157) */}
                    <Tooltip content="Notifications" position="top">
                        <button
                            data-notification-button
                            onClick={toggleNotifications}
                            className={`relative p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors ${isNotificationCenterOpen ? 'bg-white/10 text-white' : ''}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">notifications</span>
                            {unreadCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </button>
                    </Tooltip>
                    {/* Clock */}
                    <div className="flex flex-col items-end justify-center px-3 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-right min-w-[80px]">
                        <span className="text-xs font-semibold text-white leading-none mb-0.5">
                            {formatTimeShort(time)}
                        </span>
                        <span className="text-[10px] text-white/60 leading-none">{formatDateShort(time)}</span>
                    </div>
                    <Tooltip content="Show desktop" position="top">
                        <button
                            className="w-1 h-8 border-l border-white/20 ml-2 hover:bg-white/20"
                            onClick={handleMinimizeAll}
                        ></button>
                    </Tooltip>
                </div>
            </div>
            {/* Notification Center Panel (F157) */}
            <NotificationCenter />
        </div>
    );
};

interface TaskbarIconProps {
    icon: string;
    title?: string;
    active?: boolean;
    running?: boolean;
    onClick?: () => void;
    colorClass?: string;
    filled?: boolean;
    /** Badge count to display (F148) */
    badge?: number | null;
}

/**
 * Individual taskbar icon button.
 * Memoized to prevent re-renders when other taskbar items change.
 */
const TaskbarIcon: React.FC<TaskbarIconProps> = memo(function TaskbarIcon({
    icon,
    title,
    active,
    running,
    onClick,
    colorClass = 'text-white',
    filled,
    badge,
}) {
    // Format badge count for display (99+ for large numbers)
    const badgeText = badge && badge > 0 ? (badge > 99 ? '99+' : String(badge)) : null;

    return (
        <Tooltip content={title || 'App'} position="top">
            <button
                onClick={onClick}
                className={`relative w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all hover:-translate-y-1 group ${active ? 'bg-white/10' : ''}`}
            >
                <span
                    className={`material-symbols-outlined text-2xl group-hover:text-primary transition-colors ${colorClass}`}
                    style={filled ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                    {icon}
                </span>
                {running && (
                    <div
                        className="absolute -bottom-1 w-1 h-1 bg-white/80 rounded-full transition-all duration-300"
                        style={{ width: active ? '16px' : '4px', borderRadius: active ? '2px' : '50%' }}
                    ></div>
                )}
                {/* Badge (F148) */}
                {badgeText && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full shadow-lg">
                        {badgeText}
                    </span>
                )}
            </button>
        </Tooltip>
    );
});
