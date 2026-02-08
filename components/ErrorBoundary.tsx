import React from 'react';
import { View } from '../types';
import { Button } from './ui';
import { ArrowLeftIcon } from './icons';

interface Props {
  children?: React.ReactNode;
  onNavigate?: (view: View) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  // state initialization is now in constructor.
  constructor(props: Props) {
    super(props);
    // FIX: Added 'this' keyword to correctly assign to the component's state.
    this.state = {
      hasError: false,
      error: undefined,
    };
    // FIX: Added 'this' keyword to correctly bind the event handler to the component instance.
    this.handleRedirect = this.handleRedirect.bind(this);
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // You can also log the error to an error reporting service.
    console.error("Uncaught error:", error, errorInfo);
  }

  // Converted to a standard class method. The binding is now handled in the constructor.
  public handleRedirect() {
    // FIX: Added 'this' keyword to call setState and access props.
    this.setState({ hasError: false, error: undefined });
    // FIX: Added 'this' keyword to access props.
    if (this.props.onNavigate) {
        // FIX: Added 'this' keyword to access props.
        this.props.onNavigate('dashboard');
    }
  }

  public render() {
    // FIX: Added 'this' keyword to access state.
    if (this.state.hasError) {
      // You can render any custom fallback UI.
      return (
        <div className="p-8 text-center bg-red-900/50 text-red-300 rounded-lg border border-red-700">
          <h1 className="text-2xl font-bold">A apărut o eroare neașteptată.</h1>
          <p className="mt-2">Ceva nu a funcționat corect în această secțiune. Încercați să reîncărcați pagina sau să reveniți la panoul principal.</p>
          {/* FIX: Added 'this' keyword to access props and the handleRedirect method. */}
          {this.props.onNavigate && (
              <Button onClick={this.handleRedirect} variant="secondary" className="mt-6">
                  <ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la pagina principală
              </Button>
          )}
          {/* FIX: Added 'this' keyword to access state. */}
          {this.state.error && (
            <pre className="mt-4 text-left text-xs bg-black/30 p-2 rounded overflow-auto">
              {/* FIX: Added 'this' keyword to access state. */}
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    // FIX: Added 'this' keyword to access props.
    return this.props.children;
  }
}

export default ErrorBoundary;
