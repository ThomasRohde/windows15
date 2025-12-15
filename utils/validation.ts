/**
 * Form validation utilities for consistent input validation across apps
 *
 * Provides composable validators that can be combined and applied to form data.
 * Each validator returns either an error message string or null if valid.
 *
 * @module utils/validation
 * @example
 * ```ts
 * const validators = {
 *   email: [required('Email is required'), email('Invalid email format')],
 *   password: [required('Password is required'), minLength(8, 'Password must be at least 8 characters')]
 * };
 *
 * const result = validate(validators, { email: 'user@example.com', password: 'secret123' });
 * if (!result.valid) {
 *   console.error(result.errors); // { email: null, password: null } or error messages
 * }
 * ```
 */

/**
 * Validator function type - returns error message or null if valid
 */
export type Validator<T = any> = (value: T) => string | null;

/**
 * Validation result for a single field
 */
export type FieldValidation = string | null;

/**
 * Validation result for all fields
 */
export interface ValidationResult<T extends Record<string, any>> {
    valid: boolean;
    errors: Record<keyof T, string | null>;
}

/**
 * Validators configuration object
 */
export type ValidatorsConfig<T extends Record<string, any>> = {
    [K in keyof T]?: Validator<T[K]> | Validator<T[K]>[];
};

/**
 * Required field validator
 * @param message - Custom error message (default: "This field is required")
 * @returns Validator function
 */
export function required(message = 'This field is required'): Validator<any> {
    return (value: any): string | null => {
        if (value === null || value === undefined) return message;
        if (typeof value === 'string' && value.trim().length === 0) return message;
        if (Array.isArray(value) && value.length === 0) return message;
        return null;
    };
}

/**
 * Minimum length validator for strings
 * @param min - Minimum length
 * @param message - Custom error message (default: "Must be at least {min} characters")
 * @returns Validator function
 */
export function minLength(min: number, message?: string): Validator<string> {
    const defaultMessage = `Must be at least ${min} character${min === 1 ? '' : 's'}`;
    return (value: string): string | null => {
        if (!value) return null; // Let required() handle empty values
        return value.length < min ? message || defaultMessage : null;
    };
}

/**
 * Maximum length validator for strings
 * @param max - Maximum length
 * @param message - Custom error message (default: "Must be no more than {max} characters")
 * @returns Validator function
 */
export function maxLength(max: number, message?: string): Validator<string> {
    const defaultMessage = `Must be no more than ${max} character${max === 1 ? '' : 's'}`;
    return (value: string): string | null => {
        if (!value) return null; // Let required() handle empty values
        return value.length > max ? message || defaultMessage : null;
    };
}

/**
 * Email format validator
 * @param message - Custom error message (default: "Invalid email format")
 * @returns Validator function
 */
export function email(message = 'Invalid email format'): Validator<string> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return (value: string): string | null => {
        if (!value) return null; // Let required() handle empty values
        return emailRegex.test(value) ? null : message;
    };
}

/**
 * URL format validator
 * @param message - Custom error message (default: "Invalid URL format")
 * @returns Validator function
 */
export function url(message = 'Invalid URL format'): Validator<string> {
    return (value: string): string | null => {
        if (!value) return null; // Let required() handle empty values
        try {
            new URL(value);
            return null;
        } catch {
            return message;
        }
    };
}

/**
 * Pattern validator using regular expression
 * @param pattern - Regular expression pattern
 * @param message - Custom error message (default: "Invalid format")
 * @returns Validator function
 */
export function pattern(pattern: RegExp, message = 'Invalid format'): Validator<string> {
    return (value: string): string | null => {
        if (!value) return null; // Let required() handle empty values
        return pattern.test(value) ? null : message;
    };
}

/**
 * Numeric range validator
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @param message - Custom error message (default: "Must be between {min} and {max}")
 * @returns Validator function
 */
export function range(min: number, max: number, message?: string): Validator<number> {
    const defaultMessage = `Must be between ${min} and ${max}`;
    return (value: number): string | null => {
        if (value === null || value === undefined) return null; // Let required() handle empty values
        return value < min || value > max ? message || defaultMessage : null;
    };
}

/**
 * Custom validator function
 * @param fn - Custom validation function
 * @returns Validator function
 */
export function custom<T>(fn: (value: T) => boolean, message: string): Validator<T> {
    return (value: T): string | null => {
        return fn(value) ? null : message;
    };
}

/**
 * Validate a single value against multiple validators
 * @param value - Value to validate
 * @param validators - Single validator or array of validators
 * @returns First error message or null if valid
 */
export function validateValue<T>(value: T, validators: Validator<T> | Validator<T>[]): string | null {
    const validatorArray = Array.isArray(validators) ? validators : [validators];

    for (const validator of validatorArray) {
        const error = validator(value);
        if (error) return error;
    }

    return null;
}

/**
 * Validate an object against a set of validators
 * @param validators - Validators configuration object
 * @param data - Data object to validate
 * @returns Validation result with valid flag and errors object
 */
export function validate<T extends Record<string, any>>(validators: ValidatorsConfig<T>, data: T): ValidationResult<T> {
    const errors: Record<keyof T, string | null> = {} as Record<keyof T, string | null>;
    let valid = true;

    // Validate each field
    for (const field in validators) {
        const fieldValidators = validators[field];
        if (fieldValidators) {
            const error = validateValue(data[field], fieldValidators);
            errors[field] = error;
            if (error) valid = false;
        }
    }

    return { valid, errors };
}
