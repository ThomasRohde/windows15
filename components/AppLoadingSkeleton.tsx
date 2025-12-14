/**
 * Loading skeleton for lazy-loaded app content
 */
import React from 'react';

interface AppLoadingSkeletonProps {
    /** Optional app title for context */
    title?: string;
}

/**
 * Displays a loading skeleton while an app component is being loaded.
 * Used as the Suspense fallback for React.lazy components.
 */
export const AppLoadingSkeleton: React.FC<AppLoadingSkeletonProps> = ({ title }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full w-full p-6 space-y-4">
            {/* Spinning loader */}
            <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-white/50 animate-spin" />
            </div>

            {/* Loading text */}
            <div className="text-white/60 text-sm font-medium">{title ? `Loading ${title}...` : 'Loading...'}</div>

            {/* Skeleton content preview */}
            <div className="w-full max-w-md space-y-3 opacity-30">
                {/* Simulated toolbar */}
                <div className="h-8 bg-white/10 rounded animate-pulse" />

                {/* Simulated content lines */}
                <div className="space-y-2">
                    <div className="h-4 bg-white/10 rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-white/10 rounded w-full animate-pulse" />
                    <div className="h-4 bg-white/10 rounded w-5/6 animate-pulse" />
                </div>

                {/* Simulated content block */}
                <div className="h-24 bg-white/10 rounded animate-pulse" />
            </div>
        </div>
    );
};
