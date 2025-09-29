import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
 errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Обновить состояние, чтобы следующий рендер показал запасной UI
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Записать ошибку в лог
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Обновить состояние
    this.setState({
      error,
      errorInfo
    });

    // Вызвать пользовательский обработчик ошибок, если он предоставлен
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Вывести запасной UI или пользовательский fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg max-w-2xl mx-auto my-8">
          <h2 className="text-xl font-bold text-red-800 mb-2">Что-то пошло не так</h2>
          <p className="text-red-700 mb-4">
            Произошла ошибка в приложении. Пожалуйста, обновите страницу или повторите попытку позже.
          </p>
          <details className="text-sm text-red-600 bg-red-100 p-3 rounded">
            <summary>Подробнее об ошибке</summary>
            {this.state.error && this.state.error.toString()}
            {this.state.errorInfo && (
              <pre className="mt-2 whitespace-pre-wrap">
                {this.state.errorInfo.componentStack}
              </pre>
            )}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;