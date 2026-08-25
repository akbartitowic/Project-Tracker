import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Unknown runtime error',
    };
  }

  componentDidCatch(error, errorInfo) {
    // Keep this for debugging in browser console
    // eslint-disable-next-line no-console
    console.error('Unhandled React error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white p-8">
          <div className="max-w-3xl mx-auto border border-rose-500/40 bg-rose-500/10 rounded-xl p-6">
            <h1 className="text-2xl font-bold text-rose-300 mb-2">UI Runtime Error</h1>
            <p className="text-sm text-rose-100/90 mb-3">
              An error occurred while rendering the app. The page was stopped to prevent a blank screen.
            </p>
            <pre className="text-xs whitespace-pre-wrap break-words bg-slate-950/80 p-3 rounded border border-slate-700">
              {this.state.message}
            </pre>
            <button
              className="mt-4 px-4 py-2 rounded bg-white text-slate-900 font-semibold"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
