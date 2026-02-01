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

// FIX: ErrorBoundary must be a class component to use getDerivedStateFromError and componentDidCatch lifecycle methods.
// The errors regarding missing `setState` and `props` indicate the component was likely a functional component, which cannot function as an error boundary.
class ErrorBoundary extends React.Component<Props, State> {
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

  public handleRedirect = () => {
    // FIX: Use 'this.setState' to update the state in a class component. This was causing an error because functional components use `useState` hook instead.
    this.setState({ hasError: false, error: undefined });
    // FIX: Access props via 'this.props' in a class component. Functional components access props directly from arguments.
    if (this.props.onNavigate) {
        // FIX: Access props via 'this.props' in a class component.
        this.props.onNavigate('dashboard');
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-red-900/50 text-red-300 rounded-lg border border-red-700">
          <h1 className="text-2xl font-bold">A apărut o eroare neașteptată.</h1>
          <p className="mt-2">Ceva nu a funcționat corect în această secțiune. Încercați să reîncărcați pagina sau să reveniți la panoul principal.</p>
          {/* FIX: Access props via 'this.props' in a class component. */}
          {this.props.onNavigate && (
              // FIX: Access methods via 'this' in a class component.
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

    // FIX: Access children via 'this.props.children' in a class component.
    return this.props.children;
  }
}

export default ErrorBoundary;
