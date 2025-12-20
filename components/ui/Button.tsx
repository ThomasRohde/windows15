/**
 * Button component with consistent styling variants
 * @module components/ui/Button
 */

import React from 'react';
import { Icon } from './Icon';
import { Ripple } from './Ripple';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'default';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
    /** Visual style variant */
    variant?: ButtonVariant;
    /** Size of the button */
    size?: ButtonSize;
    /** Icon name from Material Symbols */
    icon?: string;
    /** Position of the icon */
    iconPosition?: 'left' | 'right';
    /** Show loading spinner */
    loading?: boolean;
    /** Make button take full width */
    wide?: boolean;
    /** Button content */
    children?: React.ReactNode;
    /** Button label (alternative to children) */
    label?: string;
    /** Additional CSS classes */
    className?: string;
    /** Whether button is disabled */
    disabled?: boolean;
    /** Click handler */
    onClick?: (e: React.MouseEvent) => void;
    /** Accessible label for icon-only buttons */
    'aria-label'?: string;
    /** Button type attribute */
    type?: 'button' | 'submit' | 'reset';
}

const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-green-500 text-white hover:bg-green-400 active:bg-green-600',
    secondary: 'bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700',
    danger: 'bg-red-500/20 text-red-300 hover:bg-red-500/30 active:bg-red-500/40',
    ghost: 'bg-transparent text-white/70 hover:bg-white/10 active:bg-white/20',
    default: 'bg-white/10 text-white hover:bg-white/20 active:bg-white/30',
};

const sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm rounded',
    md: 'px-4 py-2 text-base rounded-lg',
    lg: 'px-6 py-3 text-lg rounded-lg',
};

/**
 * A versatile button component with multiple variants and sizes.
 * Provides consistent styling across all Windows 15 applications.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Button variant="primary" onClick={handleSave}>Save</Button>
 *
 * // With icon
 * <Button variant="secondary" icon="add" size="sm">Add Item</Button>
 *
 * // Danger action
 * <Button variant="danger" icon="delete">Delete</Button>
 *
 * // Loading state
 * <Button variant="primary" loading={isSubmitting}>
 *   {isSubmitting ? 'Saving...' : 'Save'}
 * </Button>
 *
 * // Icon only
 * <Button variant="ghost" icon="close" aria-label="Close" />
 * ```
 */
export const Button: React.FC<ButtonProps> = ({
    variant = 'default',
    size = 'md',
    icon,
    iconPosition = 'left',
    loading = false,
    wide = false,
    children,
    label,
    className = '',
    disabled,
    onClick,
    type = 'button',
    ...props
}) => {
    const content = children || label;
    const isDisabled = disabled || loading;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClick?.(e);
    };

    // Handle pointer events for better touch/mouse interaction
    const handlePointerDown = (e: React.PointerEvent) => {
        e.stopPropagation();
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        e.stopPropagation();
    };

    return (
        <button
            type={type}
            className={`
                ${variantClasses[variant]}
                ${sizeClasses[size]}
                font-medium transition-all
                ${wide ? 'w-full' : ''}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
                ${!content && icon ? 'aspect-square !px-0 flex items-center justify-center' : ''}
                inline-flex items-center justify-center gap-2
                ${className}
            `.trim()}
            disabled={isDisabled}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            aria-label={props['aria-label']}
        >
            <Ripple className="w-full h-full flex items-center justify-center gap-2">
                {loading && <Icon name="progress_activity" className="animate-spin text-current" />}
                {!loading && icon && iconPosition === 'left' && <Icon name={icon} size={size} />}
                {content && <span>{content}</span>}
                {!loading && icon && iconPosition === 'right' && <Icon name={icon} size={size} />}
            </Ripple>
        </button>
    );
};
