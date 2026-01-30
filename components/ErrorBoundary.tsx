import React, { ReactNode, ErrorInfo, Component } from 'react';
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

class ErrorBoundary extends Component<Props, State> {
  // FIX: Using class field syntax to initialize state, as the constructor-based approach was causing compilation errors.
  state: State = {
    hasError: false,
    error: undefined,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  // FIX: Using an arrow function to automatically bind `this` context.
  handleRedirect = () => {
    // FIX: In a class component, `setState` and `props` must be accessed via `this`.
    this.setState({ hasError: false, error: undefined });
    if (this.props.onNavigate) {
        this.props.onNavigate('dashboard');
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-red-900/50 text-red-300 rounded-lg border border-red-700">
          <h1 className="text-2xl font-bold">A apărut o eroare neașteptată.</h1>
          <p className="mt-2">Ceva nu a funcționat corect în această secțiune. Încercați să reîncărcați pagina sau să reveniți la panoul principal.</p>
          {/* FIX: In a class component, `props` must be accessed via `this`. */}
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

    // FIX: In a class component, `props` must be accessed via `this`.
    return this.props.children;
  }
}

export default ErrorBoundary;
