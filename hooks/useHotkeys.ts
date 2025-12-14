/**
 * useHotkeys - Global keyboard shortcuts hook
 *
 * Enables registration of keyboard shortcuts with modifier key support.
 * Automatically handles cleanup on unmount.
 *
 * @example
 * ```tsx
 * // Single shortcut
 * useHotkeys('ctrl+shift+e', () => openExplorer());
 *
 * // Multiple shortcuts
 * useHotkeys({
 *   'ctrl+shift+e': openExplorer,
 *   'ctrl+shift+t': openTerminal,
 *   'alt+f4': closeWindow,
 * });
 * ```
 */
import { useEffect, useCallback, useRef } from 'react';

/**
 * Modifier keys that can be used in shortcuts
 */
type ModifierKey = 'ctrl' | 'alt' | 'shift' | 'meta';

/**
 * Parsed shortcut structure
 */
interface ParsedShortcut {
    key: string;
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
}

/**
 * Options for the useHotkeys hook
 */
export interface UseHotkeysOptions {
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
     * Whether to ignore shortcuts when focus is in an input/textarea
     * @default true
     */
    ignoreInput?: boolean;

    /**
     * Scope for the shortcuts (used for priority/context)
     */
    scope?: string;
}

/**
 * Check if the current focus is in an input-like element
 */
const isInputFocused = (): boolean => {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const tagName = activeElement.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
        return true;
    }

    // Check for contenteditable
    if (activeElement.getAttribute('contenteditable') === 'true') {
        return true;
    }

    return false;
};

/**
 * Parse a shortcut string into its components
 * @example parseShortcut('ctrl+shift+e') => { key: 'e', ctrl: true, shift: true, alt: false, meta: false }
 */
const parseShortcut = (shortcut: string): ParsedShortcut => {
    const parts = shortcut
        .toLowerCase()
        .split('+')
        .map(p => p.trim());

    const modifiers: ModifierKey[] = ['ctrl', 'alt', 'shift', 'meta'];
    const modifierFlags = {
        ctrl: false,
        alt: false,
        shift: false,
        meta: false,
    };

    let key = '';

    for (const part of parts) {
        if (modifiers.includes(part as ModifierKey)) {
            modifierFlags[part as ModifierKey] = true;
        } else {
            // Handle special key names
            key = part;
        }
    }

    return {
        key: normalizeKey(key),
        ...modifierFlags,
    };
};

/**
 * Normalize key names for consistency
 */
const normalizeKey = (key: string): string => {
    const keyMap: Record<string, string> = {
        escape: 'escape',
        esc: 'escape',
        enter: 'enter',
        return: 'enter',
        space: ' ',
        spacebar: ' ',
        up: 'arrowup',
        down: 'arrowdown',
        left: 'arrowleft',
        right: 'arrowright',
        delete: 'delete',
        del: 'delete',
        backspace: 'backspace',
        tab: 'tab',
        home: 'home',
        end: 'end',
        pageup: 'pageup',
        pagedown: 'pagedown',
        f1: 'f1',
        f2: 'f2',
        f3: 'f3',
        f4: 'f4',
        f5: 'f5',
        f6: 'f6',
        f7: 'f7',
        f8: 'f8',
        f9: 'f9',
        f10: 'f10',
        f11: 'f11',
        f12: 'f12',
    };

    return keyMap[key] ?? key;
};

/**
 * Check if a keyboard event matches a parsed shortcut
 */
const matchesShortcut = (event: KeyboardEvent, shortcut: ParsedShortcut): boolean => {
    const eventKey = event.key.toLowerCase();

    return (
        eventKey === shortcut.key &&
        event.ctrlKey === shortcut.ctrl &&
        event.altKey === shortcut.alt &&
        event.shiftKey === shortcut.shift &&
        event.metaKey === shortcut.meta
    );
};

/**
 * Hook for registering a single keyboard shortcut
 */
export function useHotkey(
    shortcut: string,
    callback: (event: KeyboardEvent) => void,
    options: UseHotkeysOptions = {}
): void {
    const { enabled = true, preventDefault = true, stopPropagation = true, ignoreInput = true } = options;

    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    const parsedShortcut = parseShortcut(shortcut);

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            // Skip if disabled
            if (!enabled) return;

            // Skip if input is focused (unless ignoreInput is false)
            if (ignoreInput && isInputFocused()) return;

            // Check if the event matches our shortcut
            if (matchesShortcut(event, parsedShortcut)) {
                if (preventDefault) {
                    event.preventDefault();
                }
                if (stopPropagation) {
                    event.stopPropagation();
                }
                callbackRef.current(event);
            }
        },
        [enabled, ignoreInput, preventDefault, stopPropagation, parsedShortcut]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}

/**
 * Hook for registering multiple keyboard shortcuts
 */
export function useHotkeys(
    shortcuts: Record<string, (event: KeyboardEvent) => void>,
    options: UseHotkeysOptions = {}
): void {
    const { enabled = true, preventDefault = true, stopPropagation = true, ignoreInput = true } = options;

    const shortcutsRef = useRef(shortcuts);
    shortcutsRef.current = shortcuts;

    const parsedShortcuts = Object.entries(shortcuts).map(([key, callback]) => ({
        parsed: parseShortcut(key),
        callback,
        original: key,
    }));

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            // Skip if disabled
            if (!enabled) return;

            // Skip if input is focused (unless ignoreInput is false)
            if (ignoreInput && isInputFocused()) return;

            // Check each registered shortcut
            for (const { parsed, original } of parsedShortcuts) {
                if (matchesShortcut(event, parsed)) {
                    if (preventDefault) {
                        event.preventDefault();
                    }
                    if (stopPropagation) {
                        event.stopPropagation();
                    }
                    // Get the latest callback from ref
                    shortcutsRef.current[original]?.(event);
                    return; // Only trigger first matching shortcut
                }
            }
        },
        [enabled, ignoreInput, preventDefault, stopPropagation, parsedShortcuts]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}

/**
 * Get a human-readable label for a shortcut
 * @example getShortcutLabel('ctrl+shift+e') => 'Ctrl+Shift+E'
 */
export const getShortcutLabel = (shortcut: string): string => {
    const parts = shortcut.split('+').map(part => {
        const trimmed = part.trim().toLowerCase();
        switch (trimmed) {
            case 'ctrl':
                return 'Ctrl';
            case 'alt':
                return 'Alt';
            case 'shift':
                return 'Shift';
            case 'meta':
                return '⌘';
            case 'escape':
            case 'esc':
                return 'Esc';
            case 'enter':
            case 'return':
                return 'Enter';
            case 'backspace':
                return '⌫';
            case 'delete':
            case 'del':
                return 'Del';
            case 'arrowup':
            case 'up':
                return '↑';
            case 'arrowdown':
            case 'down':
                return '↓';
            case 'arrowleft':
            case 'left':
                return '←';
            case 'arrowright':
            case 'right':
                return '→';
            default:
                return trimmed.toUpperCase();
        }
    });
    return parts.join('+');
};
