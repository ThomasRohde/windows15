/**
 * Hook for managing async operations with loading and error states
 * @module hooks/useAsyncAction
 */

import { useState, useCallback, useRef } from 'react';

export interface UseAsyncActionResult<T> {
    /** Execute an async function with automatic loading/error handling */
    execute: (fn: () => Promise<T>) => Promise<T | undefined>;
    /** Whether an operation is currently in progress */
    loading: boolean;
    /** Error message from the last failed operation, if any */
    error: string | null;
    /** Clear the current error */
    clearError: () => void;
    /** Whether the action is currently disabled (loading) */
    disabled: boolean;
}

export interface UseAsyncActionOptions {
    /** Custom error message prefix */
    errorPrefix?: string;
    /** Callback when an error occurs */
    onError?: (error: Error) => void;
    /** Callback when operation succeeds */
    onSuccess?: () => void;
}

/**
 * Standardized hook for async operations with loading and error state management.
 * Replaces the common try/catch/loading/error pattern found throughout apps.
 *
 * @example
 * ```tsx
 * const { execute, loading, error, clearError } = useAsyncAction<Todo>();
 *
 * const addTodo = async () => {
 *   if (!input.trim()) return;
 *   await execute(async () => {
 *     return await db.todos.add({ text: input, completed: false });
 *   });
 *   setInput('');
 * };
 *
 * return (
 *   <>
 *     {error && <ErrorBanner message={error} onDismiss={clearError} />}
 *     <button onClick={addTodo} disabled={loading}>
 *       {loading ? 'Adding...' : 'Add'}
 *     </button>
 *   </>
 * );
 * ```
 */
export function useAsyncAction<T = void>(options: UseAsyncActionOptions = {}): UseAsyncActionResult<T> {
    const { errorPrefix, onError, onSuccess } = options;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const mountedRef = useRef(true);

    // Track mounted state to prevent state updates after unmount
    useState(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    });

    const execute = useCallback(
        async (fn: () => Promise<T>): Promise<T | undefined> => {
            // Prevent concurrent executions
            if (loading) {
                return undefined;
            }

            setLoading(true);
            setError(null);

            try {
                const result = await fn();
                if (mountedRef.current) {
                    onSuccess?.();
                }
                return result;
            } catch (err) {
                if (mountedRef.current) {
                    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
                    const fullMessage = errorPrefix ? `${errorPrefix}: ${errorMessage}` : errorMessage;
                    setError(fullMessage);
                    onError?.(err instanceof Error ? err : new Error(errorMessage));
                }
                return undefined;
            } finally {
                if (mountedRef.current) {
                    setLoading(false);
                }
            }
        },
        [loading, errorPrefix, onError, onSuccess]
    );

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        execute,
        loading,
        error,
        clearError,
        disabled: loading,
    };
}
