import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        // Renamed the generic fallback wrappers to semantic error-page regions without changing recovery behavior.
        <main
          aria-labelledby="error-boundary-title"
          className="flex min-h-screen items-center justify-center bg-background p-8"
          data-testid="error-boundary"
        >
          <section className="flex w-full max-w-2xl flex-col items-center p-8" data-testid="error-boundary-panel">
            <AlertTriangle className="mb-6 flex-shrink-0 text-destructive" size={48} />

            <h2 className="mb-4 text-xl" id="error-boundary-title">
              An unexpected error occurred.
            </h2>

            <div className="mb-6 w-full overflow-auto rounded bg-muted p-4" data-testid="error-boundary-details">
              <pre className="whitespace-break-spaces text-sm text-muted-foreground">
                {this.state.error?.stack}
              </pre>
            </div>

            <button
              onClick={() => window.location.reload()}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2",
                "bg-primary text-primary-foreground",
                "cursor-pointer hover:opacity-90",
              )}
              data-testid="error-boundary-reload"
            >
              <RotateCcw size={16} />
              Reload Page
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
