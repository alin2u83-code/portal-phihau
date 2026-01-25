import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: undefined,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    // FIX: Property 'props' does not exist on type 'ErrorBoundary'.
    // Destructuring state and props can help resolve subtle type inference issues.
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="p-8 text-center bg-red-900/50 text-red-300 rounded-lg border border-red-700">
          <h1 className="text-2xl font-bold">A apărut o eroare neașteptată.</h1>
          <p className="mt-2">Ceva nu a funcționat corect în această secțiune. Încercați să reîncărcați pagina sau să navigați la o altă secțiune.</p>
          {error && (
            <pre className="mt-4 text-left text-xs bg-black/30 p-2 rounded overflow-auto">
              {error.toString()}
            </pre>
          )}
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
