import React from 'react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  type?: 'error' | 'warning' | 'info';
  showDetails?: boolean;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title = 'Ошибка',
  message,
  details,
  onRetry,
  onDismiss,
  type = 'error',
  showDetails = true
}) => {
  const getErrorStyle = () => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'error':
      default:
        return 'bg-red-50 border-red-200 text-red-800';
    }
  };

  return (
    <div className={`border rounded-lg p-4 mb-4 ${getErrorStyle()}`}>
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-2">
          <Badge variant={type === 'error' ? 'destructive' : type === 'warning' ? 'secondary' : 'default'}>
            {type === 'error' ? 'Ошибка' : type === 'warning' ? 'Предупреждение' : 'Информация'}
          </Badge>
          <h3 className="font-semibold">{title}</h3>
        </div>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="text-current hover:bg-transparent hover:text-current"
            aria-label="Закрыть"
          >
            ✕
          </Button>
        )}
      </div>
      <p className="mt-2">{message}</p>
      
      {details && showDetails && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer underline">Подробнее</summary>
          <pre className="mt-2 p-3 bg-white bg-opacity-50 rounded overflow-x-auto whitespace-pre-wrap break-words">
            {details}
          </pre>
        </details>
      )}
      
      <div className="mt-3 flex space-x-2">
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Повторить
          </Button>
        )}
        {onDismiss && (
          <Button variant="outline" size="sm" onClick={onDismiss}>
            Закрыть
          </Button>
        )}
      </div>
    </div>
  );
};

export default ErrorDisplay;