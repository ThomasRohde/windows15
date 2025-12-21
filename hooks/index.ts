/**
 * Custom React hooks for Windows15
 */

export { useAsyncAction } from './useAsyncAction';
export type { UseAsyncActionResult, UseAsyncActionOptions } from './useAsyncAction';
export { useDebounce } from './useDebounce';
export { useAppEvent, useAppEmit, useEventBus } from './useEventBus';
export { useHotkey, useHotkeys, getShortcutLabel } from './useHotkeys';
export type { UseHotkeysOptions } from './useHotkeys';
export { useStandardHotkeys } from './useStandardHotkeys';
export type { StandardHotkeysHandlers, UseStandardHotkeysOptions } from './useStandardHotkeys';
export { useInterval, useControllableInterval } from './useInterval';
export { useLocalStorage } from './useLocalStorage';
export { usePersistedState } from './usePersistedState';
export type { UsePersistedStateReturn } from './usePersistedState';
export { useSound } from './useSound';
export type { SystemSound } from './useSound';
export { useTranslation } from './useTranslation';
export type { TranslationNamespace, TFunction } from './useTranslation';
export { useWindowDrag } from './useWindowDrag';
export type { Position, UseWindowDragOptions, UseWindowDragResult } from './useWindowDrag';
export { useWindowInstance } from './useWindowInstance';
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
export { useSearchFilter } from './useSearchFilter';
export type { SearchFilterConfig, SearchFilterResult } from './useSearchFilter';
export { useSeededCollection } from './useSeededCollection';
export type { UseSeededCollectionReturn } from './useSeededCollection';
export { useAppState, useAppStateValue } from './useAppState';
export { useFilePicker } from './useFilePicker';
export type {
    FilePickerFile,
    FilePickerOpenOptions,
    FilePickerSaveOptions,
    FilePickerState,
    UseFilePickerReturn,
} from './useFilePicker';
export { useHandoff, useHandoffItems } from './useHandoff';
export { useTouchDevice } from './useTouchDevice';
export { usePinchGesture } from './usePinchGesture';
export { useVirtualKeyboard } from './useVirtualKeyboard';
export { usePhoneMode } from './usePhoneMode';
export { useOrientation } from './useOrientation';
export type { Orientation } from './useOrientation';
export { useViewportCssVars } from './useViewportCssVars';
export { useShareTarget, useShareTargetWithClear, formatSharedContent } from './useShareTarget';
export type { SharedContent } from './useShareTarget';
