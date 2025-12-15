/**
 * Card component for consistent panel styling across apps
 * @module components/ui/Card
 */

import React from 'react';

export interface CardProps {
    children: React.ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
};

/**
 * A styled card container with semi-transparent background.
 * Used across apps for displaying content sections, displays, and panels.
 *
 * @example
 * ```tsx
 * <Card>
 *   <h2>Title</h2>
 *   <p>Content</p>
 * </Card>
 *
 * <Card padding="lg" className="flex items-center justify-center">
 *   <span className="text-5xl">{value}</span>
 * </Card>
 * ```
 */
export const Card: React.FC<CardProps> = ({ children, className = '', padding = 'md' }) => {
    return <div className={`bg-black/20 rounded-xl ${paddingClasses[padding]} ${className}`}>{children}</div>;
};
