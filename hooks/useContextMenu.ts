/**
 * Hook for managing context menu state with boundary detection and keyboard support
 * @module hooks/useContextMenu
 */
import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Position for context menu
 */
export interface ContextMenuPosition {
    x: number;
    y: number;
}

/**
 * State for context menu including optional data payload
 */
export interface ContextMenuState<T = undefined> {
    position: ContextMenuPosition;
    data: T;
}

/**
 * Options for useContextMenu hook
 */
export interface UseContextMenuOptions {
    /** Estimated width of the context menu for boundary calculations */
    menuWidth?: number;
    /** Estimated height of the context menu for boundary calculations */
    menuHeight?: number;
    /** Padding from screen edges */
    padding?: number;
    /** Callback when menu is closed */
    onClose?: () => void;
}

/**
 * Return type for useContextMenu hook
 */
export interface UseContextMenuResult<T> {
    /** Current menu state or null if closed */
    menu: ContextMenuState<T> | null;
    /** Whether the menu is open */
    isOpen: boolean;
    /** Open the context menu at mouse position with optional data */
    open: (e: React.MouseEvent, data: T) => void;
    /** Close the context menu */
    close: () => void;
    /** Props to spread on the context menu element for keyboard handling */
    menuProps: {
        onKeyDown: (e: React.KeyboardEvent) => void;
        role: string;
        'aria-label': string;
        tabIndex: number;
    };
    /** Ref to attach to the menu element for focus management */
    menuRef: React.RefObject<HTMLDivElement | null>;
}

const DEFAULT_OPTIONS: Required<UseContextMenuOptions> = {
    menuWidth: 180,
    menuHeight: 200,
    padding: 8,
    onClose: () => {},
};

/**
 * Hook for managing context menu state with:
 * - Boundary detection to keep menu on screen
 * - Outside click to close
 * - Escape key to close
 * - Arrow key navigation
 * - Focus management
 *
 * @param options - Configuration options
 * @returns Context menu state and handlers
 *
 * @example
 * ```tsx
 * const { menu, open, close, menuProps, menuRef } = useContextMenu<string>();
 *
 * return (
 *   <div onContextMenu={(e) => open(e, 'item-id')}>
 *     Right click me
 *     {menu && (
 *       <ContextMenu
 *         ref={menuRef}
 *         position={menu.position}
 *         onClose={close}
 *         {...menuProps}
 *       >
 *         <ContextMenu.Item onClick={() => console.log(menu.data)}>
 *           Action
 *         </ContextMenu.Item>
 *       </ContextMenu>
 *     )}
 *   </div>
 * );
 * ```
 */
export function useContextMenu<T = undefined>(options: UseContextMenuOptions = {}): UseContextMenuResult<T> {
    const { menuWidth, menuHeight, padding, onClose } = { ...DEFAULT_OPTIONS, ...options };
    const [menu, setMenu] = useState<ContextMenuState<T> | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    /**
     * Calculate position with boundary checking
     */
    const calculatePosition = useCallback(
        (clientX: number, clientY: number): ContextMenuPosition => {
            let x = clientX;
            let y = clientY;

            // Ensure menu doesn't go off the right edge
            if (x + menuWidth > window.innerWidth - padding) {
                x = window.innerWidth - menuWidth - padding;
            }

            // Ensure menu doesn't go off the bottom edge
            if (y + menuHeight > window.innerHeight - padding) {
                y = window.innerHeight - menuHeight - padding;
            }

            // Ensure menu doesn't go off the left/top edge
            x = Math.max(padding, x);
            y = Math.max(padding, y);

            return { x, y };
        },
        [menuWidth, menuHeight, padding]
    );

    /**
     * Open the context menu at the mouse position
     */
    const open = useCallback(
        (e: React.MouseEvent, data: T) => {
            e.preventDefault();
            e.stopPropagation();
            const position = calculatePosition(e.clientX, e.clientY);
            setMenu({ position, data });
        },
        [calculatePosition]
    );

    /**
     * Close the context menu
     */
    const close = useCallback(() => {
        setMenu(null);
        onClose?.();
    }, [onClose]);

    /**
     * Handle keyboard navigation within the menu
     */
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                close();
                return;
            }

            const menuElement = menuRef.current;
            if (!menuElement) return;

            const focusableItems = menuElement.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [role="menuitem"]:not([disabled])'
            );
            const items = Array.from(focusableItems);
            const currentIndex = items.indexOf(document.activeElement as HTMLElement);

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
                items[nextIndex]?.focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
                items[prevIndex]?.focus();
            } else if (e.key === 'Home') {
                e.preventDefault();
                items[0]?.focus();
            } else if (e.key === 'End') {
                e.preventDefault();
                items[items.length - 1]?.focus();
            }
        },
        [close]
    );

    /**
     * Close menu when clicking outside
     */
    useEffect(() => {
        if (!menu) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                close();
            }
        };

        const handleContextMenuOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                close();
            }
        };

        // Use capture phase to close before other handlers
        document.addEventListener('mousedown', handleClickOutside, true);
        document.addEventListener('contextmenu', handleContextMenuOutside, true);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside, true);
            document.removeEventListener('contextmenu', handleContextMenuOutside, true);
        };
    }, [menu, close]);

    /**
     * Focus the first item when menu opens
     */
    useEffect(() => {
        if (menu && menuRef.current) {
            // Slight delay to ensure DOM is ready
            requestAnimationFrame(() => {
                const firstItem = menuRef.current?.querySelector<HTMLElement>(
                    'button:not([disabled]), [role="menuitem"]:not([disabled])'
                );
                firstItem?.focus();
            });
        }
    }, [menu]);

    const menuProps = {
        onKeyDown: handleKeyDown,
        role: 'menu',
        'aria-label': 'Context menu',
        tabIndex: -1,
    };

    return {
        menu,
        isOpen: menu !== null,
        open,
        close,
        menuProps,
        menuRef,
    };
}
