/**
 * SplitPane - Layout component for two-panel views
 *
 * Provides a flexible split layout for applications with two distinct content areas.
 * Supports both horizontal (side-by-side) and vertical (stacked) orientations.
 *
 * @example
 * ```tsx
 * // Horizontal split (50/50)
 * <SplitPane
 *   direction="horizontal"
 *   primary={<MailList />}
 *   secondary={<MailDetail />}
 * />
 *
 * // Vertical split (custom ratio)
 * <SplitPane
 *   direction="vertical"
 *   primarySize="40%"
 *   primary={<TextInput />}
 *   secondary={<Output />}
 * />
 * ```
 */
import React from 'react';

export type SplitPaneDirection = 'horizontal' | 'vertical';

export interface SplitPaneProps {
    /**
     * Layout direction
     * @default 'horizontal'
     */
    direction?: SplitPaneDirection;

    /**
     * Size of the primary pane (CSS value like '50%', '300px', or '1fr')
     * @default '50%'
     */
    primarySize?: string;

    /**
     * Content for the primary (first) pane
     */
    primary: React.ReactNode;

    /**
     * Content for the secondary (second) pane
     */
    secondary: React.ReactNode;

    /**
     * Gap between panes (Tailwind spacing class like 'gap-4')
     * @default 'gap-0'
     */
    gap?: string;

    /**
     * Additional CSS classes for the container
     */
    className?: string;
}

/**
 * SplitPane component for two-panel layouts
 *
 * Creates a flexible split layout with configurable direction and sizing.
 * Both panes support overflow scrolling and maintain proper min-height/width constraints.
 */
export const SplitPane: React.FC<SplitPaneProps> = ({
    direction = 'horizontal',
    primarySize = '50%',
    primary,
    secondary,
    gap = 'gap-0',
    className = '',
}) => {
    const isHorizontal = direction === 'horizontal';

    // Build flex classes based on direction
    const containerClass = isHorizontal ? 'flex flex-row' : 'flex flex-col';

    // Calculate secondary size based on primary size
    // For simplicity, if primary is a percentage, secondary is the remainder
    // Otherwise, secondary gets flex-1
    const getSecondaryStyle = (): React.CSSProperties => {
        if (primarySize.endsWith('%')) {
            const primaryPercent = parseFloat(primarySize);
            return {
                [isHorizontal ? 'width' : 'height']: `${100 - primaryPercent}%`,
            };
        }
        return { flex: 1 };
    };

    const getPrimaryStyle = (): React.CSSProperties => {
        return {
            [isHorizontal ? 'width' : 'height']: primarySize,
            minWidth: isHorizontal ? 0 : undefined,
            minHeight: isHorizontal ? undefined : 0,
        };
    };

    return (
        <div className={`h-full ${containerClass} ${gap} ${className}`.trim()}>
            <div
                className={`${isHorizontal ? 'min-w-0' : 'min-h-0'} flex flex-col overflow-hidden`}
                style={getPrimaryStyle()}
            >
                {primary}
            </div>
            <div
                className={`${isHorizontal ? 'min-w-0' : 'min-h-0'} flex flex-col overflow-hidden`}
                style={getSecondaryStyle()}
            >
                {secondary}
            </div>
        </div>
    );
};
