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
    // Fix: Property 'state' does not exist on type 'ErrorBoundary'. State must be initialized in the constructor.
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
    // Fix: Property 'setState' does not exist on type 'ErrorBoundary'. 'setState' must be accessed via 'this'.
    this.setState({ hasError: false, error: undefined });
    // Fix: Property 'props' does not exist on type 'ErrorBoundary'. Props must be accessed via 'this'.
    if (this.props.onNavigate) {
        // Fix: Property 'props' does not exist on type 'ErrorBoundary'. Props must be accessed via 'this'.
        this.props.onNavigate('dashboard');
    }
  }

  render() {
    // Fix: Property 'state' does not exist on type 'ErrorBoundary'. State must be accessed via 'this'.
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-red-900/50 text-red-300 rounded-lg border border-red-700">
          <h1 className="text-2xl font-bold">A apărut o eroare neașteptată.</h1>
          <p className="mt-2">Ceva nu a funcționat corect în această secțiune. Încercați să reîncărcați pagina sau să reveniți la panoul principal.</p>
          {/* Fix: Property 'props' does not exist on type 'ErrorBoundary'. Props must be accessed via 'this'. */}
          {this.props.onNavigate && (
              <Button onClick={this.handleRedirect} variant="secondary" className="mt-6">
                  <ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la pagina principală
              </Button>
          )}
          {/* Fix: Property 'state' does not exist on type 'ErrorBoundary'. State must be accessed via 'this'. */}
          {this.state.error && (
            <pre className="mt-4 text-left text-xs bg-black/30 p-2 rounded overflow-auto">
              {/* Fix: Property 'state' does not exist on type 'ErrorBoundary'. State must be accessed via 'this'. */}
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    // Fix: Property 'props' does not exist on type 'ErrorBoundary'. Props must be accessed via 'this'.
    return this.props.children;
  }
}

export default ErrorBoundary;