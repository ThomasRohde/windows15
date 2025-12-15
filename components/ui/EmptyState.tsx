/**
 * EmptyState component for consistent empty content placeholders
 * @module components/ui/EmptyState
 */

import React from 'react';
import { Icon } from './Icon';

export interface EmptyStateProps {
    /** Icon to display (Material Symbol name or custom ReactNode) */
    icon?: string | React.ReactNode;
    /** Title text (required) */
    title: string;
    /** Optional description text */
    description?: string;
    /** Optional action button or link */
    action?: React.ReactNode;
    /** Visual variant */
    variant?: 'default' | 'minimal';
    /** Additional CSS classes */
    className?: string;
}

/**
 * A component for displaying empty states with consistent styling.
 * Provides a centered layout with icon, title, description, and optional action.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <EmptyState
 *   icon="inbox"
 *   title="No messages"
 *   description="Your inbox is empty"
 * />
 *
 * // With action button
 * <EmptyState
 *   icon="folder_open"
 *   title="No files"
 *   description="Drop files here or click to upload"
 *   action={
 *     <Button onClick={handleUpload}>
 *       Upload Files
 *     </Button>
 *   }
 * />
 *
 * // Minimal variant (no border)
 * <EmptyState
 *   variant="minimal"
 *   icon="search"
 *   title="No results found"
 *   description="Try adjusting your search"
 * />
 *
 * // Custom icon
 * <EmptyState
 *   icon={<CustomIcon />}
 *   title="Custom empty state"
 * />
 * ```
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    action,
    variant = 'default',
    className = '',
}) => {
    const renderIcon = () => {
        if (!icon) return null;

        if (typeof icon === 'string') {
            return <Icon name={icon} className="text-white/30 text-6xl mb-4" />;
        }

        return <div className="mb-4">{icon}</div>;
    };

    return (
        <div
            className={`
                flex flex-col items-center justify-center
                ${variant === 'default' ? 'border-2 border-dashed border-white/20 rounded-lg' : ''}
                p-8
                text-center
                ${className}
            `.trim()}
        >
            {renderIcon()}
            <h3 className="text-white/70 text-lg font-medium mb-2">{title}</h3>
            {description && <p className="text-white/50 text-sm max-w-md">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
};
