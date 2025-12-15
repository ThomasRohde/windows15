import React from 'react';

interface AppToolbarProps {
    /** Optional title text shown on the left */
    title?: string;
    /** Action buttons or other content shown on the right */
    children?: React.ReactNode;
    /** Variant styling (default has more padding) */
    variant?: 'default' | 'compact';
    /** Additional CSS classes */
    className?: string;
}

/**
 * A standardized toolbar component for app headers.
 * Provides consistent styling with optional title and action buttons.
 */
export const AppToolbar: React.FC<AppToolbarProps> = ({ title, children, variant = 'default', className = '' }) => {
    const padding = variant === 'compact' ? 'p-2' : 'p-3';

    return (
        <div className={`flex items-center gap-3 ${padding} bg-[#2d2d2d] border-b border-white/10 ${className}`.trim()}>
            {title && <span className="text-sm text-gray-400">{title}</span>}
            <div className="flex-1" />
            {children}
        </div>
    );
};
