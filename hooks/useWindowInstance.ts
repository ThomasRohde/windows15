/**
 * useWindowInstance - Hook for apps to access their window instance methods
 *
 * Provides methods for apps to dynamically update their window's title,
 * icon, and badge count. Apps must provide their window ID to use this hook.
 *
 * @module hooks/useWindowInstance
 *
 * @example
 * ```tsx
 * // In your app component, get windowId from props
 * const MyApp: React.FC<{ windowId: string }> = ({ windowId }) => {
 *   const { setTitle, setBadge } = useWindowInstance(windowId);
 *
 *   useEffect(() => {
 *     setTitle(`My App - ${fileName}`);
 *     setBadge(unreadCount);
 *   }, [fileName, unreadCount, setTitle, setBadge]);
 *
 *   return <div>...</div>;
 * };
 * ```
 */
import { useCallback, useMemo } from 'react';
import { useWindowManager } from '../context/WindowContext';

interface UseWindowInstanceResult {
    /**
     * Set the window's dynamic title
     * @param title - New title or null to revert to default
     */
    setTitle: (title: string | null) => void;
    /**
     * Set the window's dynamic icon
     * @param icon - Material Symbols icon name or null to revert to default
     */
    setIcon: (icon: string | null) => void;
    /**
     * Set the window's badge count (displayed on taskbar)
     * @param count - Badge count or null/0 to hide
     */
    setBadge: (count: number | null) => void;
    /**
     * Current window state
     */
    window: {
        id: string;
        title: string;
        icon: string;
        badge: number | null;
        isMinimized: boolean;
        isMaximized: boolean;
    } | null;
}

/**
 * Hook for apps to access their window instance methods
 *
 * @param windowId - The window instance ID
 * @returns Window instance methods and state
 */
export const useWindowInstance = (windowId: string): UseWindowInstanceResult => {
    const { windows, setWindowTitle, setWindowIcon, setWindowBadge } = useWindowManager();

    const windowState = useMemo(() => {
        const w = windows.find(w => w.id === windowId);
        if (!w) return null;
        return {
            id: w.id,
            title: w.dynamicTitle ?? w.title,
            icon: w.dynamicIcon ?? w.icon,
            badge: w.badge ?? null,
            isMinimized: w.isMinimized,
            isMaximized: w.isMaximized,
        };
    }, [windows, windowId]);

    const setTitle = useCallback(
        (title: string | null) => {
            setWindowTitle(windowId, title);
        },
        [windowId, setWindowTitle]
    );

    const setIcon = useCallback(
        (icon: string | null) => {
            setWindowIcon(windowId, icon);
        },
        [windowId, setWindowIcon]
    );

    const setBadge = useCallback(
        (count: number | null) => {
            setWindowBadge(windowId, count);
        },
        [windowId, setWindowBadge]
    );

    return {
        setTitle,
        setIcon,
        setBadge,
        window: windowState,
    };
};
