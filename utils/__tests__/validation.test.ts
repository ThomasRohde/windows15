import { describe, expect, it } from 'vitest';
import {
    required,
    minLength,
    maxLength,
    email,
    url,
    pattern,
    range,
    custom,
    validateValue,
    validate,
    validateDateRange,
} from '../validation';

describe('validation utilities', () => {
    describe('required', () => {
        it('should return error for null/undefined', () => {
            const validator = required();
            expect(validator(null)).toBe('This field is required');
            expect(validator(undefined)).toBe('This field is required');
        });

        it('should return error for empty string', () => {
            const validator = required();
            expect(validator('')).toBe('This field is required');
            expect(validator('   ')).toBe('This field is required');
        });

        it('should return error for empty array', () => {
            const validator = required();
            expect(validator([])).toBe('This field is required');
        });

        it('should return null for valid values', () => {
            const validator = required();
            expect(validator('hello')).toBeNull();
            expect(validator(0)).toBeNull();
            expect(validator(false)).toBeNull();
            expect(validator(['item'])).toBeNull();
        });

        it('should accept custom error message', () => {
            const validator = required('Custom error');
            expect(validator(null)).toBe('Custom error');
        });
    });

    describe('minLength', () => {
        it('should return error for strings below minimum', () => {
            const validator = minLength(5);
            expect(validator('abc')).toBe('Must be at least 5 characters');
        });

        it('should return null for strings at or above minimum', () => {
            const validator = minLength(5);
            expect(validator('hello')).toBeNull();
            expect(validator('hello world')).toBeNull();
        });

        it('should return null for empty values', () => {
            const validator = minLength(5);
            expect(validator('')).toBeNull();
        });

        it('should handle singular character correctly', () => {
            const validator = minLength(1);
            expect(validator('')).toBeNull();
            expect(validator('a')).toBeNull();
        });

        it('should accept custom error message', () => {
            const validator = minLength(5, 'Too short!');
            expect(validator('abc')).toBe('Too short!');
        });
    });

    describe('maxLength', () => {
        it('should return error for strings above maximum', () => {
            const validator = maxLength(5);
            expect(validator('toolong')).toBe('Must be no more than 5 characters');
        });

        it('should return null for strings at or below maximum', () => {
            const validator = maxLength(5);
            expect(validator('hello')).toBeNull();
            expect(validator('hi')).toBeNull();
        });

        it('should return null for empty values', () => {
            const validator = maxLength(5);
            expect(validator('')).toBeNull();
        });

        it('should accept custom error message', () => {
            const validator = maxLength(5, 'Too long!');
            expect(validator('toolong')).toBe('Too long!');
        });
    });

    describe('email', () => {
        it('should validate correct email formats', () => {
            const validator = email();
            expect(validator('user@example.com')).toBeNull();
            expect(validator('test.email+tag@domain.co.uk')).toBeNull();
            expect(validator('name@subdomain.example.com')).toBeNull();
        });

        it('should return error for invalid email formats', () => {
            const validator = email();
            expect(validator('notanemail')).toBe('Invalid email format');
            expect(validator('@example.com')).toBe('Invalid email format');
            expect(validator('user@')).toBe('Invalid email format');
            expect(validator('user @example.com')).toBe('Invalid email format');
        });

        it('should return null for empty values', () => {
            const validator = email();
            expect(validator('')).toBeNull();
        });

        it('should accept custom error message', () => {
            const validator = email('Bad email');
            expect(validator('notanemail')).toBe('Bad email');
        });
    });

    describe('url', () => {
        it('should validate correct URL formats', () => {
            const validator = url();
            expect(validator('https://example.com')).toBeNull();
            expect(validator('http://localhost:3000')).toBeNull();
            expect(validator('ftp://files.example.com')).toBeNull();
        });

        it('should return error for invalid URL formats', () => {
            const validator = url();
            expect(validator('not a url')).toBe('Invalid URL format');
            expect(validator('example.com')).toBe('Invalid URL format');
        });

        it('should return null for empty values', () => {
            const validator = url();
            expect(validator('')).toBeNull();
        });

        it('should accept custom error message', () => {
            const validator = url('Bad URL');
            expect(validator('notaurl')).toBe('Bad URL');
        });
    });

    describe('pattern', () => {
        it('should validate against regex pattern', () => {
            const validator = pattern(/^\d{3}-\d{3}-\d{4}$/);
            expect(validator('123-456-7890')).toBeNull();
            expect(validator('abc-def-ghij')).toBe('Invalid format');
        });

        it('should return null for empty values', () => {
            const validator = pattern(/^\d+$/);
            expect(validator('')).toBeNull();
        });

        it('should accept custom error message', () => {
            const validator = pattern(/^\d+$/, 'Must be numeric');
            expect(validator('abc')).toBe('Must be numeric');
        });
    });

    describe('range', () => {
        it('should validate numeric range', () => {
            const validator = range(1, 10);
            expect(validator(5)).toBeNull();
            expect(validator(1)).toBeNull();
            expect(validator(10)).toBeNull();
            expect(validator(0)).toBe('Must be between 1 and 10');
            expect(validator(11)).toBe('Must be between 1 and 10');
        });

        it('should return null for null/undefined', () => {
            const validator = range(1, 10);
            expect(validator(null as unknown as number)).toBeNull();
            expect(validator(undefined as unknown as number)).toBeNull();
        });

        it('should accept custom error message', () => {
            const validator = range(1, 10, 'Out of bounds');
            expect(validator(11)).toBe('Out of bounds');
        });
    });

    describe('custom', () => {
        it('should use custom validation function', () => {
            const validator = custom((value: string) => value.startsWith('test'), 'Must start with "test"');
            expect(validator('test123')).toBeNull();
            expect(validator('abc123')).toBe('Must start with "test"');
        });

        it('should work with complex validation logic', () => {
            const validator = custom((value: number) => value % 2 === 0, 'Must be even');
            expect(validator(4)).toBeNull();
            expect(validator(5)).toBe('Must be even');
        });
    });

    describe('validateValue', () => {
        it('should validate single validator', () => {
            const result = validateValue('', required());
            expect(result).toBe('This field is required');
        });

        it('should validate array of validators', () => {
            const validators = [required(), minLength(5)];
            expect(validateValue('abc', validators)).toBe('Must be at least 5 characters');
            expect(validateValue('hello', validators)).toBeNull();
        });

        it('should return first error encountered', () => {
            const validators = [required('Field required'), minLength(5, 'Too short')];
            expect(validateValue('', validators)).toBe('Field required');
        });

        it('should stop at first error', () => {
            const validators = [minLength(5), maxLength(3)];
            expect(validateValue('ab', validators)).toBe('Must be at least 5 characters');
        });
    });

    describe('validate', () => {
        it('should validate object with multiple fields', () => {
            const validators = {
                name: required('Name is required'),
                email: [required('Email is required'), email('Invalid email')],
                age: range(0, 120, 'Invalid age'),
            };

            const result = validate(validators, {
                name: 'John',
                email: 'john@example.com',
                age: 30,
            });

            expect(result.valid).toBe(true);
            expect(result.errors).toEqual({
                name: null,
                email: null,
                age: null,
            });
        });

        it('should return errors for invalid fields', () => {
            const validators = {
                name: required('Name is required'),
                email: email('Invalid email'),
            };

            const result = validate(validators, {
                name: '',
                email: 'notanemail',
            });

            expect(result.valid).toBe(false);
            expect(result.errors.name).toBe('Name is required');
            expect(result.errors.email).toBe('Invalid email');
        });

        it('should validate only specified fields', () => {
            const validators = {
                email: email('Invalid email'),
            };

            const result = validate(validators, {
                email: 'john@example.com',
                name: 'John', // not validated
            });

            expect(result.valid).toBe(true);
            expect(result.errors.email).toBeNull();
            expect(result.errors).not.toHaveProperty('name');
        });
    });

    describe('validateDateRange', () => {
        it('should validate date range with string dates', () => {
            expect(validateDateRange('2024-01-01T09:00', '2024-01-01T10:00')).toBeNull();
            expect(validateDateRange('2024-01-01T10:00', '2024-01-01T09:00')).toBe('End time must be after start time');
        });

        it('should validate date range with Date objects', () => {
            const start = new Date('2024-01-01T09:00');
            const end = new Date('2024-01-01T10:00');
            expect(validateDateRange(start, end)).toBeNull();
            expect(validateDateRange(end, start)).toBe('End time must be after start time');
        });

        it('should return error when start equals end', () => {
            expect(validateDateRange('2024-01-01T09:00', '2024-01-01T09:00')).toBe('End time must be after start time');
        });

        it('should return null for empty values', () => {
            expect(validateDateRange('', '2024-01-01T10:00')).toBeNull();
            expect(validateDateRange('2024-01-01T09:00', '')).toBeNull();
        });

        it('should return null for invalid dates', () => {
            expect(validateDateRange('invalid', '2024-01-01T10:00')).toBeNull();
            expect(validateDateRange('2024-01-01T09:00', 'invalid')).toBeNull();
        });

        it('should accept custom error message', () => {
            expect(validateDateRange('2024-01-01T10:00', '2024-01-01T09:00', 'Custom error')).toBe('Custom error');
        });

        it('should validate across different days', () => {
            expect(validateDateRange('2024-01-01T23:00', '2024-01-02T01:00')).toBeNull();
            expect(validateDateRange('2024-01-02T01:00', '2024-01-01T23:00')).toBe('End time must be after start time');
        });
    });
});
