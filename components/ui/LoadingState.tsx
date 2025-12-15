/**
 * LoadingState component for consistent loading displays
 * @module components/ui/LoadingState
 */

import React from 'react';

export type LoadingVariant = 'spinner' | 'dots' | 'skeleton' | 'pulse';

export interface LoadingStateProps {
    /** Loading message to display */
    message?: string;
    /** Visual variant of the loading indicator */
    variant?: LoadingVariant;
    /** Size of the loading indicator */
    size?: 'sm' | 'md' | 'lg';
    /** Whether to center in the container (default: true) */
    centered?: boolean;
    /** Additional className */
    className?: string;
    /** Number of skeleton items to show (for skeleton variant) */
    skeletonCount?: number;
}

const sizeClasses = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-5xl',
};

const messageSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
};

/**
 * A consistent loading state component for use across all applications.
 * Replaces the duplicated loading UI patterns found throughout apps.
 *
 * @example
 * ```tsx
 * // Basic usage
 * if (loading) {
 *   return <LoadingState message="Loading data..." />;
 * }
 *
 * // Skeleton variant for lists
 * if (loading) {
 *   return <LoadingState variant="skeleton" skeletonCount={5} />;
 * }
 *
 * // Small inline spinner
 * <LoadingState variant="spinner" size="sm" centered={false} />
 * ```
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
    message,
    variant = 'spinner',
    size = 'md',
    centered = true,
    className = '',
    skeletonCount = 3,
}) => {
    const containerClasses = centered
        ? 'h-full flex flex-col items-center justify-center'
        : 'inline-flex items-center gap-2';

    if (variant === 'skeleton') {
        return (
            <div className={`${className} space-y-3 p-4`}>
                {Array.from({ length: skeletonCount }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                        <div className="h-4 bg-white/10 rounded w-full mb-2" />
                        <div className="h-3 bg-white/5 rounded w-3/4" />
                    </div>
                ))}
            </div>
        );
    }

    if (variant === 'dots') {
        return (
            <div className={`${containerClasses} ${className}`}>
                <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                        <div
                            key={i}
                            className={`bg-white/60 rounded-full animate-bounce ${
                                size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-2 h-2' : 'w-3 h-3'
                            }`}
                            style={{ animationDelay: `${i * 0.15}s` }}
                        />
                    ))}
                </div>
                {message && <span className={`text-white/60 ${messageSizeClasses[size]} mt-2`}>{message}</span>}
            </div>
        );
    }

    if (variant === 'pulse') {
        return (
            <div className={`${containerClasses} ${className}`}>
                <div
                    className={`bg-white/20 rounded-full animate-pulse ${
                        size === 'sm' ? 'w-8 h-8' : size === 'md' ? 'w-12 h-12' : 'w-16 h-16'
                    }`}
                />
                {message && <span className={`text-white/60 ${messageSizeClasses[size]} mt-2`}>{message}</span>}
            </div>
        );
    }

    // Default: spinner
    return (
        <div className={`${containerClasses} ${className}`}>
            <span className={`material-symbols-outlined ${sizeClasses[size]} text-white/60 animate-spin`}>
                progress_activity
            </span>
            {message && <span className={`text-white/60 ${messageSizeClasses[size]} mt-2`}>{message}</span>}
        </div>
    );
};

/**
 * A wrapper component that shows loading state or children based on loading prop.
 *
 * @example
 * ```tsx
 * <LoadingWrapper loading={isLoading} message="Fetching todos...">
 *   <TodoList todos={todos} />
 * </LoadingWrapper>
 * ```
 */
export const LoadingWrapper: React.FC<{
    loading: boolean;
    children: React.ReactNode;
    message?: string;
    variant?: LoadingVariant;
    className?: string;
}> = ({ loading, children, message, variant = 'spinner', className }) => {
    if (loading) {
        return <LoadingState message={message} variant={variant} className={className} />;
    }
    return <>{children}</>;
};
