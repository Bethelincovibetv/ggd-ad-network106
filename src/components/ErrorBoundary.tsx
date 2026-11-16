import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  resetKey?: string | number;
  sectionName?: string;
  inline?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught application error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  }

  private handleTryAgain = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const containerClass = this.props.inline
        ? "min-h-[320px] flex items-center justify-center p-4 w-full"
        : "min-h-screen flex items-center justify-center p-4 bg-background text-foreground";

      return (
        <div className={containerClass}>
          <div className="max-w-md w-full bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-black tracking-tight">
                {this.props.sectionName ? `${this.props.sectionName} encountered an issue` : "Something went wrong"}
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                An unexpected error occurred while rendering this page. Your account and data are safe.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-muted/50 rounded-xl text-left border border-border/60">
                <p className="text-[11px] font-mono text-destructive break-words line-clamp-4">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2">
              {!this.props.inline && (
                <Button
                  variant="outline"
                  onClick={this.handleGoHome}
                  className="flex-1 min-w-[110px] h-9 text-xs font-bold rounded-xl"
                >
                  <Home className="h-3.5 w-3.5 mr-1.5" />
                  Return Home
                </Button>
              )}
              <Button
                variant="outline"
                onClick={this.handleTryAgain}
                className="flex-1 min-w-[110px] h-9 text-xs font-bold rounded-xl"
              >
                Try Again
              </Button>
              <Button
                onClick={this.handleReset}
                className="flex-1 min-w-[110px] h-9 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-xs"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
