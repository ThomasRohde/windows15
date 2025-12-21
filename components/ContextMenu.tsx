/**
 * Context Menu Component
 * A reusable, accessible context menu with Windows-style glass styling
 * F244: Renders as bottom action sheet on phone
 * @module components/ContextMenu
 */
import React, { forwardRef, ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Z_INDEX } from '../utils/constants';
import { getViewportSize } from '../utils';
import { usePhoneMode } from '../hooks';

// ============================================================================
// Types
// ============================================================================

export interface ContextMenuPosition {
    x: number;
    y: number;
}

export interface ContextMenuProps {
    /** Position to render the menu */
    position: ContextMenuPosition;
    /** Children to render (ContextMenu.Item, ContextMenu.Separator, etc.) */
    children: ReactNode;
    /** Callback when menu should close */
    onClose: () => void;
    /** Additional class names */
    className?: string;
    /** Keyboard event handler from useContextMenu */
    onKeyDown?: (e: React.KeyboardEvent) => void;
    /** ARIA role */
    role?: string;
    /** ARIA label */
    'aria-label'?: string;
    /** Tab index */
    tabIndex?: number;
}

export interface ContextMenuItemProps {
    /** Click handler */
    onClick?: () => void;
    /** Material Symbols icon name */
    icon?: string;
    /** Whether the item is disabled */
    disabled?: boolean;
    /** Whether to show danger/destructive styling (red) */
    danger?: boolean;
    /** Item label/content */
    children: ReactNode;
    /** Keyboard shortcut hint */
    shortcut?: string;
    /** Additional class names */
    className?: string;
    /** Custom class for the icon */
    iconClassName?: string;
}

export interface ContextMenuSubmenuProps {
    /** Material Symbols icon name */
    icon?: string;
    /** Submenu label */
    label: string;
    /** Whether the submenu trigger is disabled */
    disabled?: boolean;
    /** Submenu items */
    children: ReactNode;
    /** Additional class names */
    className?: string;
}

export interface ContextMenuSeparatorProps {
    /** Additional class names */
    className?: string;
}

export interface ContextMenuLabelProps {
    /** Label content */
    children: ReactNode;
    /** Additional class names */
    className?: string;
}

// ============================================================================
// ContextMenu Container
// ============================================================================

/**
 * Context menu container component. Uses portal to render at document body.
 * Should be used with the useContextMenu hook.
 * F244: Renders as bottom action sheet on phone
 */
const ContextMenuRoot = forwardRef<HTMLDivElement, ContextMenuProps>(
    ({ position, children, onClose, className = '', onKeyDown, role = 'menu', tabIndex = -1, ...props }, ref) => {
        const isPhone = usePhoneMode();

        // F244: Phone action sheet layout
        if (isPhone) {
            return createPortal(
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 z-[9998] animate-in fade-in duration-150"
                        onClick={onClose}
                    />
                    {/* Action Sheet */}
                    <div
                        ref={ref}
                        role={role}
                        tabIndex={tabIndex}
                        onKeyDown={onKeyDown}
                        className={`
                            fixed bottom-0 left-0 right-0
                            bg-gray-900/98 backdrop-blur-xl
                            border-t border-white/10 rounded-t-2xl
                            shadow-2xl shadow-black/40
                            py-2 pb-[calc(0.5rem+var(--safe-area-inset-bottom))]
                            animate-in slide-in-from-bottom duration-200
                            outline-none
                            max-h-[70vh] overflow-y-auto
                            ${className}
                        `}
                        style={{ zIndex: Z_INDEX.CONTEXT_MENU }}
                        onClick={e => e.stopPropagation()}
                        {...props}
                    >
                        {/* Swipe indicator */}
                        <div className="flex justify-center py-2 mb-1">
                            <div className="w-10 h-1 bg-white/30 rounded-full" />
                        </div>
                        {children}
                        {/* Cancel button */}
                        <div className="mt-2 mx-3 mb-2">
                            <button
                                onClick={onClose}
                                className="w-full py-4 text-center text-white/90 bg-white/10 hover:bg-white/15 rounded-xl font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </>,
                document.body
            );
        }

        // Desktop dropdown layout
        return createPortal(
            <div
                ref={ref}
                role={role}
                tabIndex={tabIndex}
                onKeyDown={onKeyDown}
                className={`
                    fixed bg-gray-900/95 backdrop-blur-md
                    border border-white/10 rounded-lg
                    shadow-xl shadow-black/20
                    py-1 min-w-[180px]
                    animate-fade-in
                    outline-none
                    ${className}
                `}
                style={{
                    left: position.x,
                    top: position.y,
                    zIndex: Z_INDEX.CONTEXT_MENU,
                }}
                onClick={e => e.stopPropagation()}
                {...props}
            >
                {children}
            </div>,
            document.body
        );
    }
);

ContextMenuRoot.displayName = 'ContextMenu';

// ============================================================================
// ContextMenu.Item
// ============================================================================

/**
 * A clickable menu item with optional icon and keyboard shortcut
 * F244: Larger touch targets on phone
 */
const ContextMenuItem = ({
    onClick,
    icon,
    disabled = false,
    danger = false,
    children,
    shortcut,
    className = '',
    iconClassName,
}: ContextMenuItemProps) => {
    const isPhone = usePhoneMode();

    // F244: Larger padding and min-height for phone
    const baseStyles = isPhone
        ? `w-full px-4 py-4 min-h-[52px] text-base flex items-center gap-4 text-left transition-colors outline-none focus:bg-white/10`
        : `w-full px-3 py-2 text-sm flex items-center gap-3 text-left transition-colors outline-none focus:bg-white/10`;

    const enabledStyles = danger
        ? 'text-red-400 hover:bg-white/10 hover:text-red-300'
        : 'text-white/90 hover:bg-white/10';

    const disabledStyles = 'text-white/30 cursor-not-allowed';

    return (
        <button
            role="menuitem"
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            className={`${baseStyles} ${disabled ? disabledStyles : enabledStyles} ${className}`}
        >
            {icon && (
                <span
                    className={`material-symbols-outlined ${isPhone ? 'text-xl' : 'text-lg'} ${danger ? 'text-red-400' : iconClassName || 'text-white/60'}`}
                    aria-hidden="true"
                >
                    {icon}
                </span>
            )}
            <span className="flex-1">{children}</span>
            {shortcut && !isPhone && <span className="text-xs text-white/40 ml-auto">{shortcut}</span>}
        </button>
    );
};

ContextMenuItem.displayName = 'ContextMenu.Item';

// ============================================================================
// ContextMenu.Separator
// ============================================================================

/**
 * A horizontal divider between menu items
 */
const ContextMenuSeparator = ({ className = '' }: ContextMenuSeparatorProps) => {
    return <div className={`border-t border-white/10 my-1 ${className}`} role="separator" />;
};

ContextMenuSeparator.displayName = 'ContextMenu.Separator';

// ============================================================================
// ContextMenu.Label
// ============================================================================

/**
 * A non-interactive label/header for grouping menu items
 */
const ContextMenuLabel = ({ children, className = '' }: ContextMenuLabelProps) => {
    return (
        <div className={`px-3 py-1.5 text-xs font-medium text-white/50 uppercase tracking-wide ${className}`}>
            {children}
        </div>
    );
};

ContextMenuLabel.displayName = 'ContextMenu.Label';

// ============================================================================
// ContextMenu.Submenu
// ============================================================================

/**
 * A submenu that expands on hover with nested items
 */
const ContextMenuSubmenu = ({ icon, label, disabled = false, children, className = '' }: ContextMenuSubmenuProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [submenuPosition, setSubmenuPosition] = useState<'right' | 'left'>('right');
    const containerRef = useRef<HTMLDivElement>(null);
    const submenuRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<number | null>(null);

    const handleMouseEnter = () => {
        if (disabled) return;
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsOpen(true);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = window.setTimeout(() => {
            setIsOpen(false);
        }, 100);
    };

    // Calculate submenu position to avoid overflow
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const submenuWidth = 180;
            const { width: viewportWidth } = getViewportSize();
            if (rect.right + submenuWidth > viewportWidth) {
                setSubmenuPosition('left');
            } else {
                setSubmenuPosition('right');
            }
        }
    }, [isOpen]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const baseStyles = `
        w-full px-3 py-2 text-sm
        flex items-center gap-3
        text-left transition-colors
        outline-none
        focus:bg-white/10
    `;

    return (
        <div
            ref={containerRef}
            className={`relative ${className}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                role="menuitem"
                aria-haspopup="true"
                aria-expanded={isOpen}
                disabled={disabled}
                className={`${baseStyles} ${disabled ? 'text-white/30 cursor-not-allowed' : 'text-white/90 hover:bg-white/10'}`}
            >
                {icon && (
                    <span className="material-symbols-outlined text-lg text-white/60" aria-hidden="true">
                        {icon}
                    </span>
                )}
                <span className="flex-1">{label}</span>
                <span className="material-symbols-outlined text-sm text-white/40" aria-hidden="true">
                    chevron_right
                </span>
            </button>

            {isOpen && (
                <div
                    ref={submenuRef}
                    className={`
                        absolute top-0
                        ${submenuPosition === 'right' ? 'left-full ml-0' : 'right-full mr-0'}
                        bg-gray-900/95 backdrop-blur-md
                        border border-white/10 rounded-lg
                        shadow-xl shadow-black/20
                        py-1 min-w-[180px]
                        animate-fade-in
                    `}
                    style={{ zIndex: Z_INDEX.CONTEXT_MENU + 1 }}
                    role="menu"
                >
                    {children}
                </div>
            )}
        </div>
    );
};

ContextMenuSubmenu.displayName = 'ContextMenu.Submenu';

// ============================================================================
// Compound Component Export
// ============================================================================

export const ContextMenu = Object.assign(ContextMenuRoot, {
    Item: ContextMenuItem,
    Separator: ContextMenuSeparator,
    Label: ContextMenuLabel,
    Submenu: ContextMenuSubmenu,
});
