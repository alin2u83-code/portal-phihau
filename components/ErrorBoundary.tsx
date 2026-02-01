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
  // The state is initialized using a property initializer.
  public state: State = {
    hasError: false,
    error: undefined,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  // This method handles resetting the error state and navigating.
  // Using an arrow function ensures `this` is correctly bound.
  public handleRedirect = () => {
    // FIX: `this.setState` is called on the component instance.
    this.setState({ hasError: false, error: undefined });
    // FIX: `this.props` is accessed on the component instance.
    if (this.props.onNavigate) {
        // FIX: `this.props` is accessed on the component instance.
        this.props.onNavigate('dashboard');
    }
  }

  // The render method is part of the class, so `this` refers to the component instance.
  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-red-900/50 text-red-300 rounded-lg border border-red-700">
          <h1 className="text-2xl font-bold">A apărut o eroare neașteptată.</h1>
          <p className="mt-2">Ceva nu a funcționat corect în această secțiune. Încercați să reîncărcați pagina sau să reveniți la panoul principal.</p>
          {/* FIX: `this.props` is accessed on the component instance. */}
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

    // FIX: `this.props` is accessed on the component instance.
    return this.props.children;
  }
}

export default ErrorBoundary;
