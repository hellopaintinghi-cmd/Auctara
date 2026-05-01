// src/components/ErrorBoundary.jsx
import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="card max-w-md w-full text-center py-10">
            <div className="w-14 h-14 bg-crimson/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-crimson" />
            </div>
            <h2 className="font-display font-bold text-xl mb-2">Something went wrong</h2>
            <p className="text-muted text-sm mb-1">An unexpected error occurred on this page.</p>
            {this.state.error?.message && (
              <p className="text-xs font-mono bg-surface rounded px-3 py-2 mt-3 text-crimson text-left break-all">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-3 justify-center mt-6">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="btn-outline flex items-center gap-2 text-sm py-2"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Try Again
              </button>
              <a href="/" className="btn-primary text-sm py-2 px-4">
                Go Home
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
