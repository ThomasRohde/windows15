/**
 * StatCard - Display component for metrics and statistics
 *
 * Shows a metric value with label and optional subtitle in a consistent card style.
 * Designed for use in grid layouts to display numeric data or key metrics.
 *
 * @example
 * ```tsx
 * <StatCard label="Words" value={1234} />
 * <StatCard
 *   label="Characters"
 *   value={5678}
 *   subtitle="890 without spaces"
 * />
 * <StatCard
 *   label="CPU Usage"
 *   value="45%"
 *   icon="memory"
 * />
 * ```
 */
import React from 'react';
import { Icon } from './Icon';

export interface StatCardProps {
    /**
     * Label text displayed below the value
     */
    label: string;

    /**
     * Main value to display (number or string)
     */
    value: string | number;

    /**
     * Optional subtitle text below the label
     */
    subtitle?: string;

    /**
     * Optional icon name from Material Symbols
     */
    icon?: string;

    /**
     * Additional CSS classes
     */
    className?: string;
}

/**
 * StatCard component for displaying metrics in a grid
 */
export const StatCard: React.FC<StatCardProps> = ({ label, value, subtitle, icon, className = '' }) => {
    return (
        <div className={`bg-black/20 rounded-lg p-4 text-center ${className}`.trim()}>
            {icon && (
                <div className="mb-2">
                    <Icon name={icon} size="lg" className="text-white/60" />
                </div>
            )}
            <div className="text-3xl font-bold text-white mb-1">{value}</div>
            <div className="text-sm text-gray-400">{label}</div>
            {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
        </div>
    );
};
