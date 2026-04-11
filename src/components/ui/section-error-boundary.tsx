"use client";

import React from "react";

interface SectionErrorBoundaryProps {
  children: React.ReactNode;
  section?: string;
  /** Optional callback invoked when the user clicks the retry button */
  onRetry?: () => void;
  /** Optional callback invoked when an error is caught, useful for error reporting */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends React.Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      `[SectionError] ${this.props.section ?? "Unknown section"}:`,
      error,
      errorInfo
    );
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6 text-center"
          role="alert"
          aria-live="assertive"
        >
          <div className="text-2xl mb-2" aria-hidden="true">&#9888;</div>
          <p className="text-sm font-medium text-brand-text mb-1">
            {this.props.section
              ? `Failed to load ${this.props.section}`
              : "Something went wrong"}
          </p>
          <p className="text-xs text-brand-dim mb-3">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={this.handleRetry}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-white/[0.06] text-brand-text hover:bg-white/[0.1] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
