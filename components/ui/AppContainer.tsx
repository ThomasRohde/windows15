/**
 * AppContainer - Standardized layout wrapper for Windows 15 apps
 *
 * Provides consistent styling for app layouts with configurable padding, gap, and scroll behavior.
 * Ensures visual consistency across all apps.
 *
 * @example
 * ```tsx
 * // Standard app layout
 * <AppContainer>
 *   <h1>My App</h1>
 *   <div>Content</div>
 * </AppContainer>
 *
 * // Scrollable app with no padding
 * <AppContainer padding={false} scrollable>
 *   <LargeContent />
 * </AppContainer>
 *
 * // Custom gap size
 * <AppContainer gap="lg">
 *   <Section1 />
 *   <Section2 />
 * </AppContainer>
 * ```
 */
import React from 'react';

export interface AppContainerProps {
    children: React.ReactNode;
    /** Enable padding (default: true, adds p-4) */
    padding?: boolean;
    /** Gap size between flex children (default: 'md') */
    gap?: 'none' | 'sm' | 'md' | 'lg';
    /** Enable vertical scrolling (default: false, adds overflow-y-auto) */
    scrollable?: boolean;
    /** Additional CSS classes */
    className?: string;
}

const gapClasses = {
    none: '',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
};

export const AppContainer = ({
    children,
    padding = true,
    gap = 'md',
    scrollable = false,
    className,
}: AppContainerProps) => {
    const classes = [
        'h-full w-full min-h-0 min-w-0 bg-background-dark flex flex-col',
        padding && 'p-4',
        gapClasses[gap],
        scrollable && 'overflow-y-auto touch-scroll',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return <div className={classes}>{children}</div>;
};
