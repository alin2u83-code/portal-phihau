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
  constructor(props: Props) {
    super(props);
    // FIX: In a class component constructor, state must be assigned to `this.state`.
    this.state = {
      hasError: false,
      error: undefined,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleRedirect = () => {
    // FIX: `setState` is a method on the class component instance and must be called with `this.setState`.
    this.setState({ hasError: false, error: undefined });
    // FIX: Props are accessed via `this.props` in a class component.
    if (this.props.onNavigate) {
        // FIX: Props are accessed via `this.props` in a class component.
        this.props.onNavigate('dashboard');
    }
  }

  render() {
    // FIX: State is accessed via `this.state` in a class component.
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-red-900/50 text-red-300 rounded-lg border border-red-700">
          <h1 className="text-2xl font-bold">A apărut o eroare neașteptată.</h1>
          <p className="mt-2">Ceva nu a funcționat corect în această secțiune. Încercați să reîncărcați pagina sau să reveniți la panoul principal.</p>
          {/* FIX: Props and methods on a class component must be accessed via `this`. */}
          {this.props.onNavigate && (
              <Button onClick={this.handleRedirect} variant="secondary" className="mt-6">
                  <ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la pagina principală
              </Button>
          )}
          {/* FIX: State is accessed via `this.state` in a class component. */}
          {this.state.error && (
            <pre className="mt-4 text-left text-xs bg-black/30 p-2 rounded overflow-auto">
              {/* FIX: State is accessed via `this.state` in a class component. */}
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    // FIX: Props are accessed via `this.props` in a class component.
    return this.props.children;
  }
}

export default ErrorBoundary;
