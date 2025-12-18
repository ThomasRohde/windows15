/**
 * Components barrel exports
 */

export { AppLoadingSkeleton } from './AppLoadingSkeleton';
export { AriaLiveProvider, useAriaLive } from './AriaLiveRegion';
export { ContextMenu } from './ContextMenu';
export type {
    ContextMenuProps,
    ContextMenuItemProps,
    ContextMenuSeparatorProps,
    ContextMenuSubmenuProps,
    ContextMenuLabelProps,
} from './ContextMenu';
export { DesktopIcon } from './DesktopIcon';
export { ErrorBoundary } from './ErrorBoundary';
export { FileExplorer } from './FileExplorer';
export { FilePickerModal } from './FilePickerModal';
export { InstallButton } from './InstallButton';
export {
    SkeletonBlock,
    SkeletonList,
    SkeletonListItem,
    SkeletonCard,
    SkeletonCalendar,
    SkeletonFileSidebar,
    SkeletonFileGrid,
    SkeletonEmailList,
    DelayedSkeleton,
} from './LoadingSkeleton';
export { LoginScreen } from './LoginScreen';
export { NotificationCenter } from './NotificationCenter';
export { NotificationToast } from './NotificationToast';
export { OverviewMode } from './OverviewMode';
export { PWAUpdatePrompt } from './PWAUpdatePrompt';
export { ReconnectingToast } from './ReconnectingToast';
export { Screensaver } from './Screensaver';
export { StartMenu } from './StartMenu';
export { SyncStatus } from './SyncStatus';
export { Taskbar } from './Taskbar';
export { WallpaperHost } from './WallpaperHost';
export { Widgets } from './Widgets';
export { Window } from './Window';

// UI primitives for apps
export { Card, TabSwitcher, AppSidebar, ErrorBanner } from './ui';
export type { TabOption, SidebarItem } from './ui';
