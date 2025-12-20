import React, { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { useLocalization, useOS, useNotificationCenter } from '../context';
import { useHandoffItems, usePhoneMode, useOrientation } from '../hooks';
import { SyncStatus } from './SyncStatus';
import { NotificationCenter } from './NotificationCenter';
import { Tooltip } from './ui';

// Pinned apps configuration - static list
const PINNED_APPS = [
    'explorer',
    'browser',
    'mail',
    'calendar',
    'handoff',
    'notepad',
    'calculator',
    'settings',
] as const;

export const Taskbar = () => {
    const { toggleStartMenu, isStartMenuOpen, apps, openWindow, windows, minimizeWindow } = useOS();
    const { formatTimeShort, formatDateShort } = useLocalization();
    const { toggle: toggleNotifications, unreadCount, isOpen: isNotificationCenterOpen } = useNotificationCenter();
    const isPhone = usePhoneMode();
    const orientation = useOrientation();
    const isPhoneLandscape = isPhone && orientation === 'landscape';
    const [time, setTime] = useState(new Date());
    const newHandoffItems = useHandoffItems('new');
    const newHandoffCount = newHandoffItems?.length ?? 0;

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

    // Get the active (focused) window for phone display
    const activeWindow = useMemo(() => {
        if (!windows.length) return null;
        const maxZ = Math.max(...windows.map(w => w.zIndex));
        return windows.find(w => w.zIndex === maxZ && !w.isMinimized) || null;
    }, [windows]);

    return (
        <div
            data-taskbar
            className={
                isPhoneLandscape
                    ? 'fixed top-0 left-0 h-full z-50 flex items-center'
                    : 'fixed left-1/2 transform -translate-x-1/2 z-50'
            }
            style={
                isPhoneLandscape
                    ? { left: 'var(--safe-area-inset-left)', paddingTop: 'var(--safe-area-inset-top)' }
                    : { bottom: 'calc(1.5rem + var(--safe-area-inset-bottom))' }
            }
        >
            {isPhoneLandscape ? (
                // Phone landscape - vertical taskbar on left edge (F234)
                <div className="flex flex-col items-center justify-between h-[calc(100vh-var(--safe-area-inset-top)-var(--safe-area-inset-bottom))] w-12 py-3 glass-panel rounded-r-2xl shadow-2xl ring-1 ring-white/10 gap-3">
                    {/* Start Button */}
                    <button
                        data-testid="start-menu-button"
                        onClick={toggleStartMenu}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors active:scale-95 ${isStartMenuOpen ? 'bg-white/10' : ''}`}
                    >
                        <span
                            className="material-symbols-outlined text-primary text-2xl"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                            grid_view
                        </span>
                    </button>

                    {/* Active app indicator - vertical centered */}
                    {activeWindow && (
                        <div className="flex flex-col items-center flex-1 justify-center min-h-0">
                            <span
                                className={`material-symbols-outlined text-xl ${apps.find(a => a.id === activeWindow.appId)?.color.replace('bg-', 'text-')}`}
                            >
                                {activeWindow.dynamicIcon ?? activeWindow.icon}
                            </span>
                        </div>
                    )}

                    {/* Notification toggle */}
                    <button
                        data-notification-button
                        onClick={toggleNotifications}
                        className={`relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 text-white/70 hover:text-white transition-colors ${isNotificationCenterOpen ? 'bg-white/10 text-white' : ''}`}
                    >
                        <span className="material-symbols-outlined text-xl">notifications</span>
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>
                </div>
            ) : isPhone ? (
                // Phone-optimized minimal layout (F227)
                <div className="flex items-center justify-between h-12 px-3 glass-panel rounded-full shadow-2xl ring-1 ring-white/10 gap-3 w-[90vw] max-w-[400px]">
                    {/* Start Button */}
                    <button
                        data-testid="start-menu-button"
                        onClick={toggleStartMenu}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors active:scale-95 ${isStartMenuOpen ? 'bg-white/10' : ''}`}
                    >
                        <span
                            className="material-symbols-outlined text-primary text-2xl"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                            grid_view
                        </span>
                    </button>

                    {/* Active app indicator */}
                    {activeWindow && (
                        <div className="flex items-center gap-2 flex-1 justify-center min-w-0">
                            <span
                                className={`material-symbols-outlined text-xl ${apps.find(a => a.id === activeWindow.appId)?.color.replace('bg-', 'text-')}`}
                            >
                                {activeWindow.dynamicIcon ?? activeWindow.icon}
                            </span>
                            <span className="text-sm text-white/90 truncate">
                                {activeWindow.dynamicTitle ?? activeWindow.title}
                            </span>
                        </div>
                    )}

                    {/* Notification toggle */}
                    <button
                        data-notification-button
                        onClick={toggleNotifications}
                        className={`relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 text-white/70 hover:text-white transition-colors ${isNotificationCenterOpen ? 'bg-white/10 text-white' : ''}`}
                    >
                        <span className="material-symbols-outlined text-xl">notifications</span>
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>
                </div>
            ) : (
                // Desktop layout
                <div className="flex items-center h-16 [@media(pointer:coarse)]:h-20 px-3 glass-panel rounded-full shadow-2xl ring-1 ring-white/10 gap-2 md:gap-4 [@media(pointer:coarse)]:gap-3 transition-all">
                    {/* Start Button */}
                    <Tooltip content="Start Menu" position="top">
                        <button
                            data-testid="start-menu-button"
                            onClick={toggleStartMenu}
                            className={`w-10 h-10 [@media(pointer:coarse)]:w-12 [@media(pointer:coarse)]:h-12 rounded-full flex items-center justify-center hover:bg-white/10 transition-all active:scale-95 group relative ml-1 ${isStartMenuOpen ? 'bg-white/10' : ''}`}
                        >
                            <div className="absolute inset-0 bg-primary/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <span
                                className="material-symbols-outlined text-primary text-3xl [@media(pointer:coarse)]:text-4xl relative z-10"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                                grid_view
                            </span>
                        </button>
                    </Tooltip>

                    <div className="w-px h-8 bg-white/10 mx-1"></div>

                    {/* App Icons (Pinned + Open) */}
                    <div className="flex gap-1 md:gap-2 [@media(pointer:coarse)]:gap-2">
                        {/* Render Pinned Apps */}
                        {PINNED_APPS.map(id => {
                            const app = apps.find(a => a.id === id);
                            if (!app) return null;
                            const appWindow = windows.find(w => w.appId === id);
                            const isOpen = appWindow && !appWindow.isMinimized;
                            const isRunning = !!appWindow;
                            // Get badge count from the window state (F148) or Handoff unread count (F203)
                            const badge =
                                id === 'handoff'
                                    ? newHandoffCount || appWindow?.badge || null
                                    : (appWindow?.badge ?? null);

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
                    <div className="flex items-center gap-1 md:gap-2 [@media(pointer:coarse)]:gap-3 mr-1">
                        <Tooltip content="Show hidden icons" position="top">
                            <button className="p-2 [@media(pointer:coarse)]:p-3 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-[18px] [@media(pointer:coarse)]:text-[22px]">
                                    expand_less
                                </span>
                            </button>
                        </Tooltip>
                        <Tooltip content="Network, Sound, Battery" position="top">
                            <div className="flex items-center gap-3 px-3 py-1.5 [@media(pointer:coarse)]:px-4 [@media(pointer:coarse)]:py-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer group">
                                <span className="material-symbols-outlined text-[18px] [@media(pointer:coarse)]:text-[22px] text-white">
                                    wifi
                                </span>
                                <span className="material-symbols-outlined text-[18px] [@media(pointer:coarse)]:text-[22px] text-white">
                                    volume_up
                                </span>
                                <span className="material-symbols-outlined text-[18px] [@media(pointer:coarse)]:text-[22px] text-white">
                                    battery_full
                                </span>
                            </div>
                        </Tooltip>
                        <SyncStatus />
                        {/* Notification Center (F157) */}
                        <Tooltip content="Notifications" position="top">
                            <button
                                data-notification-button
                                onClick={toggleNotifications}
                                className={`relative p-2 [@media(pointer:coarse)]:p-3 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors ${isNotificationCenterOpen ? 'bg-white/10 text-white' : ''}`}
                            >
                                <span className="material-symbols-outlined text-[18px] [@media(pointer:coarse)]:text-[22px]">
                                    notifications
                                </span>
                                {unreadCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] [@media(pointer:coarse)]:min-w-[20px] [@media(pointer:coarse)]:h-[20px] px-1 flex items-center justify-center bg-red-500 text-white text-[9px] [@media(pointer:coarse)]:text-[11px] font-bold rounded-full">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </button>
                        </Tooltip>
                        {/* Clock */}
                        <div className="flex flex-col items-end justify-center px-3 py-1 [@media(pointer:coarse)]:px-4 [@media(pointer:coarse)]:py-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-right min-w-[80px] [@media(pointer:coarse)]:min-w-[90px]">
                            <span className="text-xs [@media(pointer:coarse)]:text-sm font-semibold text-white leading-none mb-0.5">
                                {formatTimeShort(time)}
                            </span>
                            <span className="text-[10px] [@media(pointer:coarse)]:text-xs text-white/60 leading-none">
                                {formatDateShort(time)}
                            </span>
                        </div>
                        <Tooltip content="Show desktop" position="top">
                            <button
                                className="w-1 [@media(pointer:coarse)]:w-2 h-8 [@media(pointer:coarse)]:h-10 border-l border-white/20 ml-2 hover:bg-white/20"
                                onClick={handleMinimizeAll}
                            ></button>
                        </Tooltip>
                    </div>
                </div>
            )}
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
                className={`relative w-10 h-10 [@media(pointer:coarse)]:w-12 [@media(pointer:coarse)]:h-12 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all hover:-translate-y-1 group ${active ? 'bg-white/10' : ''}`}
            >
                <span
                    className={`material-symbols-outlined text-2xl [@media(pointer:coarse)]:text-3xl group-hover:text-primary transition-colors ${colorClass}`}
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
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] [@media(pointer:coarse)]:min-w-[20px] [@media(pointer:coarse)]:h-[20px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] [@media(pointer:coarse)]:text-[11px] font-bold rounded-full shadow-lg">
                        {badgeText}
                    </span>
                )}
            </button>
        </Tooltip>
    );
});
