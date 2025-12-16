/**
 * Select component with consistent dark theme styling
 * @module components/ui/Select
 */

import React, { forwardRef } from 'react';
import { Icon } from './Icon';

export interface SelectOption<T = string> {
    value: T;
    label: string;
    disabled?: boolean;
}

export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectProps<T extends string | number = string> extends Omit<
    React.SelectHTMLAttributes<HTMLSelectElement>,
    'size' | 'value' | 'onChange'
> {
    /** Array of options */
    options: SelectOption<T>[];
    /** Current selected value */
    value?: T;
    /** Change handler */
    onChange?: (value: T, event: React.ChangeEvent<HTMLSelectElement>) => void;
    /** Visual size variant */
    size?: SelectSize;
    /** Error state */
    error?: boolean;
    /** Placeholder option (shown when value is undefined/empty) */
    placeholder?: string;
    /** Additional CSS classes */
    className?: string;
}

const sizeClasses: Record<SelectSize, string> = {
    sm: 'h-8 px-2 py-1 text-sm rounded',
    md: 'h-9 px-3 py-2 text-sm rounded-lg',
    lg: 'h-11 px-4 py-3 text-base rounded-lg',
};

/**
 * A styled select component for dropdown selection.
 * Provides consistent dark theme styling across all Windows 15 applications.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Select
 *   options={[
 *     { value: 'option1', label: 'Option 1' },
 *     { value: 'option2', label: 'Option 2' },
 *   ]}
 *   value={selected}
 *   onChange={setSelected}
 * />
 *
 * // With placeholder
 * <Select
 *   options={countries}
 *   value={country}
 *   onChange={setCountry}
 *   placeholder="Select a country"
 * />
 *
 * // With error state
 * <Select
 *   options={priorities}
 *   value={priority}
 *   onChange={setPriority}
 *   error={!priority}
 *   placeholder="Select priority"
 * />
 *
 * // Small size variant
 * <Select
 *   size="sm"
 *   options={filters}
 *   value={filter}
 *   onChange={setFilter}
 * />
 * ```
 */
const SelectComponent = forwardRef(
    <T extends string | number>(
        {
            options,
            value,
            onChange,
            size = 'md',
            error = false,
            placeholder,
            className = '',
            disabled,
            ...props
        }: SelectProps<T>,
        ref: React.Ref<HTMLSelectElement>
    ) => {
        const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
            const newValue = e.target.value as T;
            onChange?.(newValue, e);
        };

        return (
            <div className={`relative inline-block ${className}`}>
                <select
                    ref={ref}
                    value={value}
                    onChange={handleChange}
                    disabled={disabled}
                    className={`
                        w-full
                        bg-black/20
                        ${error ? 'border-red-500/50' : 'border-white/10'}
                        border
                        focus:outline-none
                        ${error ? 'focus:border-red-500' : 'focus:border-blue-500/50'}
                        text-white/90
                        transition-colors
                        appearance-none
                        cursor-pointer
                        pr-8
                        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                        ${sizeClasses[size]}
                    `.trim()}
                    {...props}
                >
                    {placeholder && (
                        <option value="" disabled>
                            {placeholder}
                        </option>
                    )}
                    {options.map(option => (
                        <option
                            key={String(option.value)}
                            value={option.value}
                            disabled={option.disabled}
                            className="bg-gray-800"
                        >
                            {option.label}
                        </option>
                    ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Icon name="expand_more" className="text-white/50" size="sm" />
                </div>
            </div>
        );
    }
);

// Type assertion for the Select component
export const Select = SelectComponent as <T extends string | number>(
    props: SelectProps<T> & { ref?: React.Ref<HTMLSelectElement> }
) => React.ReactElement;
