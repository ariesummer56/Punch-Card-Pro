import { ReactNode, Component, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[PunchCard Pro] Error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="max-w-md text-center">
            <h1 className="mb-3 text-2xl font-bold text-foreground">Something went wrong</h1>
            <p className="mb-6 text-muted-foreground">
              The app hit an unexpected error. Try refreshing the page, or contact support if it keeps happening.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.href = '/';
              }}
              className="rounded-lg bg-primary px-6 py-3 text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Back to Home
            </button>
            <p className="mt-4 text-xs text-muted-foreground">
              support@punchcardpro.io
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
