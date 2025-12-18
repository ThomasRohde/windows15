import React from 'react';

export interface CheckboxProps {
    /** Whether the checkbox is checked */
    checked: boolean;
    /** Callback when checkbox state changes */
    onChange: (checked: boolean) => void;
    /** Label text displayed next to the checkbox */
    label?: string;
    /** Whether the checkbox is disabled */
    disabled?: boolean;
    /** Whether the checkbox is in an indeterminate state */
    indeterminate?: boolean;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Additional CSS classes for the container */
    className?: string;
    /** Additional CSS classes for the checkbox input */
    checkboxClassName?: string;
    /** Additional CSS classes for the label */
    labelClassName?: string;
}

/**
 * Reusable checkbox component with label support, accessibility features, and consistent styling.
 * Used throughout the app for boolean input controls.
 *
 * Features:
 * - Keyboard accessible (Space to toggle)
 * - Supports indeterminate state for parent checkboxes
 * - Label click toggles checkbox
 * - Focus ring for keyboard navigation
 * - Disabled state
 * - Multiple size variants
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Checkbox
 *   checked={isEnabled}
 *   onChange={setIsEnabled}
 *   label="Enable feature"
 * />
 *
 * // Without label
 * <Checkbox
 *   checked={completed}
 *   onChange={setCompleted}
 * />
 *
 * // Indeterminate state (e.g., parent checkbox)
 * <Checkbox
 *   checked={allSelected}
 *   indeterminate={someSelected}
 *   onChange={toggleAll}
 *   label="Select all"
 * />
 * ```
 */
export const Checkbox: React.FC<CheckboxProps> = ({
    checked,
    onChange,
    label,
    disabled = false,
    indeterminate = false,
    size = 'md',
    className = '',
    checkboxClassName = '',
    labelClassName = '',
}) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Set indeterminate property directly on DOM element
    React.useEffect(() => {
        if (inputRef.current) {
            inputRef.current.indeterminate = indeterminate;
        }
    }, [indeterminate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!disabled) {
            onChange(e.target.checked);
        }
    };

    // Size classes
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
    };

    const checkboxClasses = `
        ${sizeClasses[size]}
        rounded
        accent-blue-500
        cursor-pointer
        disabled:opacity-50
        disabled:cursor-not-allowed
        ${checkboxClassName}
    `
        .trim()
        .replace(/\s+/g, ' ');

    const containerClasses = `
        flex
        items-center
        gap-2
        ${label ? 'cursor-pointer select-none' : ''}
        ${className}
    `
        .trim()
        .replace(/\s+/g, ' ');

    const defaultLabelClasses = 'text-white/80';
    const labelClasses = labelClassName || defaultLabelClasses;

    if (label) {
        return (
            <label className={containerClasses}>
                <input
                    ref={inputRef}
                    type="checkbox"
                    checked={checked}
                    onChange={handleChange}
                    disabled={disabled}
                    className={checkboxClasses}
                />
                <span className={labelClasses}>{label}</span>
            </label>
        );
    }

    return (
        <input
            ref={inputRef}
            type="checkbox"
            checked={checked}
            onChange={handleChange}
            disabled={disabled}
            className={checkboxClasses}
        />
    );
};
