// components/ui/ErrorBoundary.tsx
'use client';
import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  context?: string; // e.g. "DynamicForm" for logging
}

/**
 * Client-side error boundary for containing component crashes.
 * Wraps dynamic renderers so a bad config never takes down the whole page.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.context ?? 'unknown'}]`, error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 space-y-1">
          <div className="font-medium">⚠ Component error</div>
          <div className="text-xs text-red-500 font-mono">
            {this.state.error?.message ?? 'An unexpected rendering error occurred.'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-xs underline text-red-600 hover:text-red-800"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
