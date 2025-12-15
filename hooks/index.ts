/**
 * Custom React hooks for Windows15
 */

export { useAsyncAction } from './useAsyncAction';
export type { UseAsyncActionResult, UseAsyncActionOptions } from './useAsyncAction';
export { useDebounce } from './useDebounce';
export { useAppEvent, useAppEmit, useEventBus } from './useEventBus';
export { useHotkey, useHotkeys, getShortcutLabel } from './useHotkeys';
export type { UseHotkeysOptions } from './useHotkeys';
export { useInterval, useControllableInterval } from './useInterval';
export { useLocalStorage } from './useLocalStorage';
export { usePersistedState } from './usePersistedState';
export type { UsePersistedStateReturn } from './usePersistedState';
export { useWindowDrag } from './useWindowDrag';
export type { Position, UseWindowDragOptions, UseWindowDragResult } from './useWindowDrag';
export { useWindowResize } from './useWindowResize';
export type { Size, ResizeDirection, UseWindowResizeOptions, UseWindowResizeResult } from './useWindowResize';
export { useWindowPersistence } from './useWindowPersistence';
export type { UseWindowPersistenceResult } from './useWindowPersistence';
export { useTerminalPreferences } from './useTerminalPreferences';
export { useContextMenu } from './useContextMenu';
export type {
    ContextMenuPosition,
    ContextMenuState,
    UseContextMenuOptions,
    UseContextMenuResult,
} from './useContextMenu';
export { useCopyToClipboard } from './useCopyToClipboard';
export { useNotification } from './useNotification';
export type { NotificationOptions, UseNotificationReturn } from './useNotification';
export { useSeededCollection } from './useSeededCollection';
export type { UseSeededCollectionReturn } from './useSeededCollection';
