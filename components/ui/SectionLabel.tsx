import React from 'react';

interface SectionLabelProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * A consistent section label component for app forms and layouts.
 * Provides text-white/60 text-sm mb-2 styling by default with optional className overrides.
 */
export const SectionLabel: React.FC<SectionLabelProps> = ({ children, className = '' }) => {
    return <div className={`text-white/60 text-sm mb-2 ${className}`.trim()}>{children}</div>;
};
