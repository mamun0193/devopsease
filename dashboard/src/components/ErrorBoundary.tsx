import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Application-wide Error Boundary to prevent blank screens.
 * 
 * This catches React rendering errors and displays a user-friendly
 * error message instead of a white screen.
 * 
 * Common causes this catches:
 * - .toFixed() called on null (stats data not ready)
 * - Accessing properties on undefined objects
 * - Failed async renders during backend initialization
 */
class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        this.setState({ errorInfo });
        // Log to console for debugging
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Allow custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-red-500/30 rounded-xl p-8 max-w-lg w-full shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                                <svg
                                    className="w-5 h-5 text-red-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-slate-100">Something went wrong</h2>
                        </div>

                        <p className="text-slate-400 mb-4">
                            An unexpected error occurred while rendering the application.
                            This might be caused by temporary data loading issues.
                        </p>

                        {this.state.error && (
                            <div className="bg-slate-800/50 rounded-lg p-3 mb-4 overflow-x-auto">
                                <code className="text-sm text-red-400 font-mono">
                                    {this.state.error.message}
                                </code>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={this.handleRetry}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors"
                            >
                                Reload Page
                            </button>
                        </div>

                        {import.meta.env.DEV && this.state.errorInfo && (
                            <details className="mt-4">
                                <summary className="text-slate-500 cursor-pointer hover:text-slate-400 text-sm">
                                    Stack trace (development only)
                                </summary>
                                <pre className="mt-2 text-xs text-slate-500 overflow-x-auto bg-slate-800/30 p-3 rounded">
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
