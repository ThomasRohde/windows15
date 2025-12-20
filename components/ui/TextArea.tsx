/**
 * TextArea component with consistent dark theme styling
 * @module components/ui/TextArea
 */

import React, { forwardRef } from 'react';

export type TextAreaVariant = 'default' | 'code';
export type TextAreaResize = 'none' | 'vertical' | 'horizontal' | 'both';

export interface TextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
    /** Visual style variant */
    variant?: TextAreaVariant;
    /** Resize behavior */
    resize?: TextAreaResize;
    /** Number of visible text rows */
    rows?: number;
    /** Error state */
    error?: boolean;
    /** Additional CSS classes */
    className?: string;
}

const variantClasses: Record<TextAreaVariant, string> = {
    default: 'text-white/90',
    code: 'font-mono text-sm text-white/90',
};

const resizeClasses: Record<TextAreaResize, string> = {
    none: 'resize-none',
    vertical: 'resize-y',
    horizontal: 'resize-x',
    both: 'resize',
};

/**
 * A styled textarea component for multi-line text input.
 * Provides consistent dark theme styling across all Windows 15 applications.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <TextArea
 *   value={text}
 *   onChange={(e) => setText(e.target.value)}
 *   placeholder="Enter text..."
 *   rows={5}
 * />
 *
 * // Code variant with monospace font
 * <TextArea
 *   variant="code"
 *   value={jsonText}
 *   onChange={(e) => setJsonText(e.target.value)}
 *   placeholder="Paste JSON here..."
 * />
 *
 * // With error state
 * <TextArea
 *   value={input}
 *   onChange={(e) => setInput(e.target.value)}
 *   error={hasError}
 *   placeholder="Required field"
 * />
 *
 * // Allow vertical resize
 * <TextArea
 *   value={notes}
 *   onChange={(e) => setNotes(e.target.value)}
 *   resize="vertical"
 *   rows={4}
 * />
 * ```
 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
    ({ variant = 'default', resize = 'none', rows = 4, error = false, className = '', ...props }, ref) => {
        return (
            <textarea
                ref={ref}
                rows={rows}
                className={`
                    w-full
                    bg-black/20
                    rounded-lg
                    border
                    ${error ? 'border-red-500/50' : 'border-white/10'}
                    p-3
                    focus:outline-none
                    ${error ? 'focus:border-red-500' : 'focus:border-blue-500/50'}
                    ${variantClasses[variant]}
                    ${resizeClasses[resize]}
                    transition-colors
                    select-text
                    ${className}
                `.trim()}
                {...props}
            />
        );
    }
);

TextArea.displayName = 'TextArea';
