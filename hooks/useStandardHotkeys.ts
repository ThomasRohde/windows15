/**
 * useStandardHotkeys - Wrapper for common keyboard shortcuts
 *
 * Provides a standardized way to handle common keyboard shortcuts across apps.
 * Respects app focus context and input element focus.
 *
 * @example
 * ```tsx
 * useStandardHotkeys({
 *   onSave: () => saveDocument(),
 *   onCopy: () => copyToClipboard(),
 *   onClear: () => clearContent(),
 * });
 * ```
 */
import { useHotkeys } from './useHotkeys';

/**
 * Standard keyboard shortcut handlers
 */
export interface StandardHotkeysHandlers {
    /**
     * Handler for Ctrl+S (Save)
     */
    onSave?: () => void;

    /**
     * Handler for Ctrl+C (Copy) - only triggers when not in input/textarea
     */
    onCopy?: () => void;

    /**
     * Handler for Ctrl+Shift+C (Copy All)
     */
    onCopyAll?: () => void;

    /**
     * Handler for Escape (Clear/Cancel)
     */
    onClear?: () => void;

    /**
     * Handler for Ctrl+Z (Undo)
     */
    onUndo?: () => void;

    /**
     * Handler for Ctrl+Y or Ctrl+Shift+Z (Redo)
     */
    onRedo?: () => void;

    /**
     * Handler for Ctrl+N (New)
     */
    onNew?: () => void;

    /**
     * Handler for Ctrl+O (Open)
     */
    onOpen?: () => void;

    /**
     * Handler for Ctrl+Shift+S (Save As)
     */
    onSaveAs?: () => void;

    /**
     * Handler for Delete (Delete selected item)
     */
    onDelete?: () => void;
}

/**
 * Options for useStandardHotkeys
 */
export interface UseStandardHotkeysOptions {
    /**
     * Whether to enable the shortcuts
     * @default true
     */
    enabled?: boolean;

    /**
     * Whether to prevent default browser behavior
     * @default true
     */
    preventDefault?: boolean;

    /**
     * Whether to stop event propagation
     * @default true
     */
    stopPropagation?: boolean;

    /**
     * Scope for the shortcuts (used for priority/context)
     */
    scope?: string;
}

/**
 * Hook for standard keyboard shortcuts
 *
 * @param handlers - Object with standard shortcut handlers
 * @param options - Configuration options
 */
export const useStandardHotkeys = (
    handlers: StandardHotkeysHandlers,
    options: UseStandardHotkeysOptions = {}
): void => {
    const { enabled = true, preventDefault = true, stopPropagation = true, scope } = options;

    // Build hotkey mappings from provided handlers
    const hotkeyMap: Record<string, () => void> = {};

    if (handlers.onSave) {
        hotkeyMap['ctrl+s'] = handlers.onSave;
    }

    if (handlers.onSaveAs) {
        hotkeyMap['ctrl+shift+s'] = handlers.onSaveAs;
    }

    if (handlers.onCopy) {
        // Only trigger when not in input/textarea (handled by ignoreInput option)
        hotkeyMap['ctrl+c'] = handlers.onCopy;
    }

    if (handlers.onCopyAll) {
        hotkeyMap['ctrl+shift+c'] = handlers.onCopyAll;
    }

    if (handlers.onClear) {
        hotkeyMap['escape'] = handlers.onClear;
    }

    if (handlers.onUndo) {
        hotkeyMap['ctrl+z'] = handlers.onUndo;
    }

    if (handlers.onRedo) {
        hotkeyMap['ctrl+y'] = handlers.onRedo;
        hotkeyMap['ctrl+shift+z'] = handlers.onRedo;
    }

    if (handlers.onNew) {
        hotkeyMap['ctrl+n'] = handlers.onNew;
    }

    if (handlers.onOpen) {
        hotkeyMap['ctrl+o'] = handlers.onOpen;
    }

    if (handlers.onDelete) {
        hotkeyMap['delete'] = handlers.onDelete;
    }

    // Register hotkeys using the base useHotkeys hook
    useHotkeys(hotkeyMap, {
        enabled,
        preventDefault,
        stopPropagation,
        ignoreInput: true, // Always ignore when focused in inputs
        scope,
    });
};
