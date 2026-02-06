import React, { ReactNode, ErrorInfo } from 'react';
import { View } from '../types';
import { Button } from './ui';
import { ArrowLeftIcon } from './icons';

interface Props {
  children?: ReactNode;
  onNavigate?: (view: View) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  // Use class property syntax for state initialization.
  state: State = {
    hasError: false,
    error: undefined,
  };

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service.
    console.error("Uncaught error:", error, errorInfo);
  }

  // Use an arrow function to automatically bind 'this'.
  handleRedirect = () => {
    // FIX: 'setState' is a method on the class instance and must be called with 'this.setState'.
    this.setState({ hasError: false, error: undefined });
    // FIX: 'props' are a property on the class instance and must be accessed with 'this.props'.
    if (this.props.onNavigate) {
        // FIX: 'props' are a property on the class instance and must be accessed with 'this.props'.
        this.props.onNavigate('dashboard');
    }
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI.
      return (
        <div className="p-8 text-center bg-red-900/50 text-red-300 rounded-lg border border-red-700">
          <h1 className="text-2xl font-bold">A apărut o eroare neașteptată.</h1>
          <p className="mt-2">Ceva nu a funcționat corect în această secțiune. Încercați să reîncărcați pagina sau să reveniți la panoul principal.</p>
          {/* FIX: 'props' are a property on the class instance and must be accessed with 'this.props'. */}
          {this.props.onNavigate && (
              <Button onClick={this.handleRedirect} variant="secondary" className="mt-6">
                  <ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la pagina principală
              </Button>
          )}
          {this.state.error && (
            <pre className="mt-4 text-left text-xs bg-black/30 p-2 rounded overflow-auto">
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    // FIX: 'props' are a property on the class instance and must be accessed with 'this.props'.
    return this.props.children;
  }
}

export default ErrorBoundary;