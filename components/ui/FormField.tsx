/**
 * FormField - Wrapper component for form inputs with label and error display
 *
 * Provides consistent form field styling across the application with:
 * - Label above input
 * - Optional required indicator
 * - Error message display below
 * - Accessibility features (htmlFor/id connection)
 *
 * @example
 * ```tsx
 * <FormField label="Email" required error={emailError}>
 *   <TextInput value={email} onChange={setEmail} />
 * </FormField>
 * ```
 */
import React from 'react';

export interface FormFieldProps {
    /**
     * Label text displayed above the input
     */
    label: string;

    /**
     * Whether the field is required
     * @default false
     */
    required?: boolean;

    /**
     * Error message to display below the input
     */
    error?: string;

    /**
     * Optional help text displayed below the label
     */
    helpText?: string;

    /**
     * ID for the input element (used for htmlFor connection)
     */
    id?: string;

    /**
     * Input element(s) to render within the field
     */
    children: React.ReactNode;

    /**
     * Additional CSS classes for the container
     */
    className?: string;
}

/**
 * FormField component for consistent form input presentation
 */
export const FormField: React.FC<FormFieldProps> = ({
    label,
    required = false,
    error,
    helpText,
    id,
    children,
    className = '',
}) => {
    return (
        <div className={`flex flex-col gap-1 ${className}`.trim()}>
            <label htmlFor={id} className="text-xs text-white/60">
                {label}
                {required && (
                    <span className="text-red-400 ml-1" aria-label="required">
                        *
                    </span>
                )}
            </label>

            {helpText && <span className="text-xs text-white/40 -mt-0.5">{helpText}</span>}

            {children}

            {error && (
                <span className="text-xs text-red-400 mt-0.5" role="alert">
                    {error}
                </span>
            )}
        </div>
    );
};
