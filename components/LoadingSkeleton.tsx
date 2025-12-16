/**
 * LoadingSkeleton - Versatile loading skeleton components
 *
 * Provides visual placeholders while async content loads.
 * Includes variants for common UI patterns.
 */
import React from 'react';

/**
 * Base skeleton element with pulse animation
 */
export const SkeletonBlock: React.FC<{
    className?: string;
    style?: React.CSSProperties;
}> = ({ className = '', style }) => (
    <div className={`bg-white/10 rounded animate-pulse ${className}`} style={style} aria-hidden="true" />
);

/**
 * Skeleton for a single list item with icon and text
 */
export const SkeletonListItem: React.FC<{ withSubtext?: boolean }> = ({ withSubtext = false }) => (
    <div className="flex items-center gap-3 p-3">
        <SkeletonBlock className="w-8 h-8 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-4 w-3/4" />
            {withSubtext && <SkeletonBlock className="h-3 w-1/2" />}
        </div>
    </div>
);

/**
 * Skeleton for a list of items (e.g., notes, files)
 */
export const SkeletonList: React.FC<{
    count?: number;
    withSubtext?: boolean;
}> = ({ count = 5, withSubtext = false }) => (
    <div className="space-y-1" aria-busy="true" aria-label="Loading content">
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonListItem key={i} withSubtext={withSubtext} />
        ))}
    </div>
);

/**
 * Skeleton for a card element
 */
export const SkeletonCard: React.FC<{
    height?: string;
}> = ({ height = 'h-32' }) => (
    <div className={`p-4 rounded-lg bg-white/5 border border-white/10 ${height}`}>
        <div className="space-y-3 h-full flex flex-col">
            <SkeletonBlock className="h-5 w-2/3" />
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-4/5" />
            <div className="flex-1" />
            <SkeletonBlock className="h-3 w-1/3" />
        </div>
    </div>
);

/**
 * Skeleton for calendar grid cells
 */
export const SkeletonCalendar: React.FC = () => (
    <div className="space-y-4" aria-busy="true" aria-label="Loading calendar">
        {/* Header row */}
        <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-6" />
            ))}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-10" />
            ))}
        </div>
    </div>
);

/**
 * Skeleton for file explorer sidebar
 */
export const SkeletonFileSidebar: React.FC<{ count?: number }> = ({ count = 6 }) => (
    <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading folders">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
                <SkeletonBlock className="w-5 h-5" />
                <SkeletonBlock className="h-4 flex-1" style={{ width: `${60 + Math.random() * 30}%` }} />
            </div>
        ))}
    </div>
);

/**
 * Skeleton for file explorer grid
 */
export const SkeletonFileGrid: React.FC<{ count?: number }> = ({ count = 12 }) => (
    <div
        className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 p-4"
        aria-busy="true"
        aria-label="Loading files"
    >
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
                <SkeletonBlock className="w-12 h-12" />
                <SkeletonBlock className="h-3 w-16" />
            </div>
        ))}
    </div>
);

/**
 * Skeleton for email list
 */
export const SkeletonEmailList: React.FC<{ count?: number }> = ({ count = 8 }) => (
    <div className="divide-y divide-white/5" aria-busy="true" aria-label="Loading emails">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3">
                <SkeletonBlock className="w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="flex justify-between">
                        <SkeletonBlock className="h-4 w-1/3" />
                        <SkeletonBlock className="h-3 w-16" />
                    </div>
                    <SkeletonBlock className="h-3 w-2/3" />
                    <SkeletonBlock className="h-3 w-full" />
                </div>
            </div>
        ))}
    </div>
);

/**
 * Generic loading wrapper with delayed display
 * Prevents skeleton flash for fast loads
 */
export const DelayedSkeleton: React.FC<{
    isLoading: boolean;
    delay?: number;
    children: React.ReactNode;
    skeleton: React.ReactNode;
}> = ({ isLoading, delay = 200, children, skeleton }) => {
    const [showSkeleton, setShowSkeleton] = React.useState(false);

    React.useEffect(() => {
        if (isLoading) {
            const timer = setTimeout(() => setShowSkeleton(true), delay);
            return () => clearTimeout(timer);
        } else {
            setShowSkeleton(false);
            return;
        }
    }, [isLoading, delay]);

    if (isLoading && showSkeleton) {
        return <>{skeleton}</>;
    }

    if (isLoading) {
        // Still loading but delay hasn't passed - show nothing or previous content
        return null;
    }

    return <>{children}</>;
};
