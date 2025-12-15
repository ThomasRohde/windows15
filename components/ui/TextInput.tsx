/**
 * TextInput component with consistent dark theme styling
 * @module components/ui/TextInput
 */

import React, { forwardRef } from 'react';

export type TextInputType =
    | 'text'
    | 'number'
    | 'email'
    | 'password'
    | 'url'
    | 'tel'
    | 'search'
    | 'date'
    | 'time'
    | 'datetime-local';
export type TextInputSize = 'sm' | 'md' | 'lg';

export interface TextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'className'> {
    /** Input type */
    type?: TextInputType;
    /** Visual size variant */
    size?: TextInputSize;
    /** Error state */
    error?: boolean;
    /** Additional CSS classes */
    className?: string;
    /** Icon or content to display before input */
    startAdornment?: React.ReactNode;
    /** Icon or content to display after input */
    endAdornment?: React.ReactNode;
}

const sizeClasses: Record<TextInputSize, string> = {
    sm: 'h-8 px-2 py-1 text-sm rounded',
    md: 'h-9 px-3 py-2 text-sm rounded-lg',
    lg: 'h-11 px-4 py-3 text-base rounded-lg',
};

/**
 * A styled input component for single-line text input.
 * Provides consistent dark theme styling across all Windows 15 applications.
 *
 * @example
 * ```tsx
 * // Basic text input
 * <TextInput
 *   value={name}
 *   onChange={(e) => setName(e.target.value)}
 *   placeholder="Enter your name"
 * />
 *
 * // Number input with min/max
 * <TextInput
 *   type="number"
 *   value={age}
 *   onChange={(e) => setAge(e.target.value)}
 *   min={0}
 *   max={120}
 *   placeholder="Age"
 * />
 *
 * // With error state
 * <TextInput
 *   type="email"
 *   value={email}
 *   onChange={(e) => setEmail(e.target.value)}
 *   error={!isValidEmail(email)}
 *   placeholder="Email address"
 * />
 *
 * // Small size variant
 * <TextInput
 *   size="sm"
 *   value={query}
 *   onChange={(e) => setQuery(e.target.value)}
 *   placeholder="Quick search..."
 * />
 *
 * // With adornments
 * <TextInput
 *   value={url}
 *   onChange={(e) => setUrl(e.target.value)}
 *   startAdornment={<span className="text-white/50">https://</span>}
 *   endAdornment={<Icon name="link" />}
 * />
 * ```
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
    ({ type = 'text', size = 'md', error = false, className = '', startAdornment, endAdornment, ...props }, ref) => {
        if (startAdornment || endAdornment) {
            return (
                <div className={`flex items-center gap-2 ${className}`}>
                    {startAdornment && <div className="flex-shrink-0">{startAdornment}</div>}
                    <input
                        ref={ref}
                        type={type}
                        className={`
                            flex-1
                            bg-black/20
                            ${error ? 'border-red-500/50' : 'border-white/10'}
                            border
                            focus:outline-none
                            ${error ? 'focus:border-red-500' : 'focus:border-blue-500/50'}
                            text-white/90
                            placeholder:text-white/30
                            transition-colors
                            ${sizeClasses[size]}
                        `.trim()}
                        {...props}
                    />
                    {endAdornment && <div className="flex-shrink-0">{endAdornment}</div>}
                </div>
            );
        }

        return (
            <input
                ref={ref}
                type={type}
                className={`
                    w-full
                    bg-black/20
                    ${error ? 'border-red-500/50' : 'border-white/10'}
                    border
                    focus:outline-none
                    ${error ? 'focus:border-red-500' : 'focus:border-blue-500/50'}
                    text-white/90
                    placeholder:text-white/30
                    transition-colors
                    ${sizeClasses[size]}
                    ${className}
                `.trim()}
                {...props}
            />
        );
    }
);

TextInput.displayName = 'TextInput';
