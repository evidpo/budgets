import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppError, GlobalErrorHandler, ErrorHandler, AuthErrorHandler } from './errorHandler';
import ErrorDisplay from '@/components/ErrorDisplay';

interface GlobalErrorContextType {
  errors: AppError[];
  addError: (error: AppError) => void;
 clearErrors: () => void;
  removeError: (index: number) => void;
}

const GlobalErrorContext = createContext<GlobalErrorContextType | undefined>(undefined);

export const GlobalErrorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [errors, setErrors] = useState<AppError[]>([]);

 const addError = (error: AppError) => {
    setErrors(prev => [...prev, error]);
  };

  const removeError = (index: number) => {
    setErrors(prev => prev.filter((_, i) => i !== index));
  };

  const clearErrors = () => {
    setErrors([]);
  };

  // Регистрируем глобальный обработчик ошибок
  useEffect(() => {
    const handleError = (error: AppError) => {
      // Обрабатываем ошибки авторизации отдельно
      AuthErrorHandler.handleAuthError(error);
      
      // Добавляем ошибку в список для отображения
      addError(error);
    };

    GlobalErrorHandler.addHandler(handleError);

    return () => {
      GlobalErrorHandler.removeHandler(handleError);
    };
  }, []);

  // Глобальный обработчик для асинхронных ошибок
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const appError = ErrorHandler.convertError(event.reason);
      GlobalErrorHandler.handleError(appError);
      event.preventDefault(); // Предотвращаем стандартное поведение
    };

    const handleError = (event: ErrorEvent) => {
      const appError = ErrorHandler.convertError(event.error);
      GlobalErrorHandler.handleError(appError);
      event.preventDefault(); // Предотвращаем стандартное поведение
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <GlobalErrorContext.Provider value={{ errors, addError, clearErrors, removeError }}>
      <>
        {children}
        {/* Отображение глобальных ошибок */}
        <div className="fixed top-4 right-4 z-50 space-y-2 w-full max-w-sm">
          {errors.map((error, index) => (
            <ErrorDisplay
              key={index}
              title={error.type === 'authentication' ? 'Ошибка аутентификации' :
                     error.type === 'authorization' ? 'Ошибка авторизации' :
                     error.type === 'validation' ? 'Ошибка валидации' :
                     error.type === 'network' ? 'Ошибка сети' :
                     'Ошибка приложения'}
              message={ErrorHandler.getUserMessage(error)}
              details={error.details ? JSON.stringify(error.details, null, 2) : undefined}
              type={error.type === 'authentication' || error.type === 'authorization' ? 'warning' :
                    error.type === 'validation' ? 'warning' :
                    error.type === 'network' ? 'info' : 'error'}
              onDismiss={() => removeError(index)}
              onRetry={error.type === 'network' ? () => window.location.reload() : undefined}
              showDetails={false}
            />
          ))}
        </div>
      </>
    </GlobalErrorContext.Provider>
 );
};

export const useGlobalError = (): GlobalErrorContextType => {
  const context = useContext(GlobalErrorContext);
  if (context === undefined) {
    throw new Error('useGlobalError must be used within a GlobalErrorProvider');
  }
  return context;
};