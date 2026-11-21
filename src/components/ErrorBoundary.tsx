import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Something went wrong while loading the store.',
    };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Storefront error caught by boundary:', error, info);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="fixed bottom-4 right-4 z-[100] max-w-md rounded-2xl border border-[#C9B6CF] bg-[#F8F1F9] p-5 text-[#26132A] shadow-xl"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6E5873]">
            FLIP iT Storefront Notice
          </p>
          <p className="mt-1.5 text-sm leading-relaxed">
            A store data sync error occurred. Reload or sign in again to continue.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="mt-3 rounded-full bg-[#2D1833] px-4 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            Dismiss
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
