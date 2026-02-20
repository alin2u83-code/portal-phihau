import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

class IconErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Icon loading error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <>&#x1f94b;</>; // Default fallback: 🥋
    }

    return this.props.children;
  }
}

export default IconErrorBoundary;
