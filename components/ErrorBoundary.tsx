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

/**
 * Standard Error Boundary component to catch rendering errors in the UI tree.
 * Inheriting from React.Component ensures access to setState and lifecycle methods.
 */
// FIX: Refactored to a more traditional class component syntax to ensure compatibility and correct 'this' context typing.
class ErrorBoundary extends React.Component<Props, State> {
  // state is now initialized in the constructor
  public state: State;

  constructor(props: Props) {
    super(props);
    // FIX: Initializing state in the constructor for broader compatibility.
    this.state = {
      hasError: false,
      error: undefined,
    };
    // FIX: Binding the method here to ensure `this` is correct when called from an event handler.
    this.handleRedirect = this.handleRedirect.bind(this);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  // FIX: Changed from an arrow function class field to a regular method to avoid potential issues with class field syntax support.
  handleRedirect() {
    this.setState({ hasError: false, error: undefined });
    if (this.props.onNavigate) {
        this.props.onNavigate('dashboard');
    }
  }

  render() {
    // Correctly access state from the component instance.
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-red-900/50 text-red-300 rounded-lg border border-red-700">
          <h1 className="text-2xl font-bold">A apărut o eroare neașteptată.</h1>
          <p className="mt-2">Ceva nu a funcționat corect în această secțiune. Încercați să reîncărcați pagina sau să reveniți la panoul principal.</p>
          {/* Access props from the React.Component instance correctly */}
          {this.props.onNavigate && (
              <Button onClick={this.handleRedirect} variant="secondary" className="mt-6">
                  <ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la pagina principală
              </Button>
          )}
          {/* Display error details if available in state. */}
          {this.state.error && (
            <pre className="mt-4 text-left text-xs bg-black/30 p-2 rounded overflow-auto">
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    // Access children from the React.Component props.
    return this.props.children;
  }
}

export default ErrorBoundary;
