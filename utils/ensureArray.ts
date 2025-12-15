/**
 * Type-safe array coercion utility
 *
 * Ensures a value is an array, returning an empty array for null/undefined/non-array values.
 *
 * @template T - The type of items in the array
 * @param value - The value to coerce to an array
 * @returns The original array if already an array, otherwise an empty array
 *
 * @example
 * ```tsx
 * // Safe array access
 * const items = ensureArray(maybeArray);
 * items.forEach(item => console.log(item)); // Always safe
 *
 * // Type-safe with generics
 * const users: User[] = ensureArray(response.data);
 * ```
 */
export const ensureArray = <T>(value: T[] | null | undefined): T[] => {
    return Array.isArray(value) ? value : [];
};
