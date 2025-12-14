/**
 * Error Boundary component for graceful error handling
 *
 * Wraps child components and catches JavaScript errors anywhere in the
 * child component tree, logs errors, and displays a fallback UI.
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
    /** Child components to wrap */
    children: ReactNode;
    /** Optional title for context in error UI */
    title?: string;
    /** Callback when error occurs */
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    /** Callback to retry/reload the component */
    onReset?: () => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * React Error Boundary for catching and displaying errors gracefully.
 * Must be a class component as hooks cannot catch errors.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log error to console with stack trace
        console.error('ErrorBoundary caught an error:', error);
        console.error('Component stack:', errorInfo.componentStack);

        this.setState({ errorInfo });

        // Call optional error callback
        this.props.onError?.(error, errorInfo);
    }

    handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
        this.props.onReset?.();
    };

    render(): ReactNode {
        if (this.state.hasError) {
            const { title } = this.props;
            const { error } = this.state;

            return (
                <div className="flex flex-col items-center justify-center h-full w-full p-6 bg-red-900/20">
                    {/* Error icon */}
                    <div className="text-red-400 mb-4">
                        <span className="material-symbols-outlined text-5xl">error</span>
                    </div>

                    {/* Error title */}
                    <h2 className="text-white text-lg font-semibold mb-2">
                        {title ? `${title} encountered an error` : 'Something went wrong'}
                    </h2>

                    {/* Error message */}
                    <p className="text-white/70 text-sm text-center mb-4 max-w-md">
                        {error?.message || 'An unexpected error occurred'}
                    </p>

                    {/* Reload button */}
                    <button
                        onClick={this.handleReset}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">refresh</span>
                        <span>Try Again</span>
                    </button>

                    {/* Error details (collapsible) */}
                    {process.env.NODE_ENV === 'development' && error?.stack && (
                        <details className="mt-4 w-full max-w-lg">
                            <summary className="text-white/50 text-xs cursor-pointer hover:text-white/70">
                                Show error details
                            </summary>
                            <pre className="mt-2 p-2 bg-black/30 rounded text-xs text-red-300/70 overflow-auto max-h-32">
                                {error.stack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
