/**
 * ErrorBanner component for displaying error messages
 * @module components/ui/ErrorBanner
 */

import React from 'react';

export interface ErrorBannerProps {
    message: string;
    onDismiss?: () => void;
    className?: string;
}

/**
 * A styled error banner for displaying error messages in apps.
 * Provides consistent error styling across all applications.
 *
 * @example
 * ```tsx
 * {error && (
 *   <ErrorBanner
 *     message={error}
 *     onDismiss={() => setError(null)}
 *   />
 * )}
 * ```
 */
export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onDismiss, className = '' }) => {
    return (
        <div
            className={`bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm flex items-center justify-between ${className}`}
            role="alert"
        >
            <span>{message}</span>
            {onDismiss && (
                <button
                    type="button"
                    onClick={onDismiss}
                    className="text-red-400 hover:text-red-300 ml-2 p-1"
                    aria-label="Dismiss error"
                >
                    <span className="material-symbols-outlined text-base">close</span>
                </button>
            )}
        </div>
    );
};
