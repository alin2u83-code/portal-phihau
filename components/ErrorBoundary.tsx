import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  onNavigate: (view: any) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
        const isRLSError = this.state.error?.message.includes('403') || this.state.error?.message.includes('RLS');
        return (
            <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg text-white text-center">
                <h1 className="text-2xl font-bold text-red-400">A apărut o eroare</h1>
                {isRLSError ? (
                    <p className="mt-2">Eroare RLS: Acces Refuzat. Nu aveți permisiunile necesare pentru a vizualiza aceste date.</p>
                ) : (
                    <p className="mt-2">Ceva nu a funcționat corect. Vă rugăm să reîncărcați pagina.</p>
                )}
                <pre className="mt-4 text-left bg-black/30 p-2 rounded text-xs overflow-auto">
                    {this.state.error?.stack}
                </pre>
                <button onClick={() => this.props.onNavigate('dashboard')} className="mt-4 px-4 py-2 bg-amber-500 text-black font-bold rounded hover:bg-amber-600">
                    Înapoi la Panoul de Control
                </button>
            </div>
        );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
