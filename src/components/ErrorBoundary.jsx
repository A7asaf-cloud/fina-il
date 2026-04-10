import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-6
                      bg-red-950/30 border border-red-800/50 rounded-xl text-center gap-4">
        <AlertTriangle className="w-12 h-12 text-red-400" />
        <div>
          <h3 className="text-lg font-semibold text-red-300 mb-1">
            שגיאה ברכיב — {this.props.componentName || 'לא ידוע'}
          </h3>
          <p className="text-sm text-slate-400 mb-2">
            אירעה שגיאה בלתי צפויה. המידע הנותר לא נפגע.
          </p>
          {this.state.error && (
            <code className="block text-xs text-red-400 bg-slate-900 rounded p-2 max-w-lg text-left dir-ltr overflow-auto">
              {this.state.error.toString()}
            </code>
          )}
        </div>
        <button
          onClick={this.handleReset}
          className="flex items-center gap-2 px-4 py-2 bg-red-800/50 hover:bg-red-700/50
                     text-red-200 rounded-lg text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          נסה שוב
        </button>
      </div>
    );
  }
}

// HOC wrapper for function components
export function withErrorBoundary(Component, componentName) {
  return function WrappedComponent(props) {
    return (
      <ErrorBoundary componentName={componentName}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
