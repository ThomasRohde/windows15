/**
 * Icon - Consistent Material Symbols rendering component
 *
 * Provides a standardized way to render Material Symbols icons across the application.
 * Ensures consistent sizing and styling for all icon usage.
 *
 * @example
 * ```tsx
 * // Default medium size
 * <Icon name="home" />
 *
 * // Large icon with custom color
 * <Icon name="settings" size="lg" className="text-blue-500" />
 *
 * // Extra small icon
 * <Icon name="check" size="xs" />
 * ```
 */
import React from 'react';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface IconProps {
    /** Material Symbols icon identifier (e.g., 'home', 'settings', 'check') */
    name: string;
    /** Icon size (default: 'md') */
    size?: IconSize;
    /** Additional CSS classes for custom styling */
    className?: string;
}

const sizeClasses: Record<IconSize, string> = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
};

export const Icon = ({ name, size = 'md', className }: IconProps) => {
    const classes = ['material-symbols-outlined', sizeClasses[size], className].filter(Boolean).join(' ');

    return <span className={classes}>{name}</span>;
};
