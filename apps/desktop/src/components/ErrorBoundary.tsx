import { Component, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-dark p-8">
          <div className="max-w-md text-center">
            <div className="p-4 rounded-full bg-error/10 border-2 border-error/40 inline-flex mb-6">
              <AlertTriangle size={48} className="text-error" />
            </div>
            <h1 className="text-3xl font-bold text-text-primary mb-3">
              Something went wrong
            </h1>
            <p className="text-base text-text-secondary mb-6">
              An unexpected error occurred. Please try restarting the application.
            </p>
            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-xs text-text-tertiary cursor-pointer hover:text-text-secondary">
                  Error details
                </summary>
                <pre className="mt-2 p-3 bg-surface-elevated rounded-lg text-xs text-error overflow-auto max-h-32">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-6 py-3 btn-primary mx-auto"
            >
              <RotateCcw size={18} />
              Restart Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
