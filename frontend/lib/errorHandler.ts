// Типы ошибок для унифицированной обработки
export interface AppError {
  type: 'validation' | 'authentication' | 'authorization' | 'network' | 'server' | 'unknown';
  message: string;
  code?: string;
  details?: any;
  originalError?: any;
}

// Словарь пользовательских сообщений об ошибках
const ERROR_MESSAGES: Record<string, string> = {
  // Ошибки аутентификации
  'Auth session not found': 'Сессия аутентификации не найдена. Пожалуйста, войдите снова.',
  'JWT expired': 'Сессия истекла. Пожалуйста, войдите снова.',
  'Invalid login credentials': 'Неверные учетные данные. Пожалуйста, проверьте логин и пароль.',
  
  // Ошибки авторизации
  'insufficient permissions': 'У вас недостаточно прав для выполнения этого действия.',
  'access denied': 'Доступ запрещен. У вас нет прав для выполнения этого действия.',
  
  // Ошибки валидации
  'invalid input': 'Некорректные данные. Пожалуйста, проверьте введенные значения.',
 'required field': 'Обязательное поле не заполнено.',
  
  // Ошибки сети
  'Network request failed': 'Не удалось подключиться к серверу. Проверьте подключение к интернету.',
  'Failed to fetch': 'Не удалось выполнить запрос. Проверьте подключение к интернету.',
  
  // Ошибки сервера
  'Internal Server Error': 'Внутренняя ошибка сервера. Пожалуйста, попробуйте позже.',
  'Database connection failed': 'Ошибка подключения к базе данных.',
  
  // Общие ошибки
  'Unexpected error': 'Произошла непредвиденная ошибка. Пожалуйста, попробуйте позже.',
  'Record not found': 'Запись не найдена.',
};

/**
 * Сервис для обработки ошибок
 */
export class ErrorHandler {
  /**
   * Преобразует произвольную ошибку в унифицированный формат
   */
  static convertError(error: any): AppError {
    // Если это уже AppError, возвращаем как есть
    if (this.isAppError(error)) {
      return error;
    }

    // Проверяем, является ли ошибка ошибкой Supabase
    if (this.isSupabaseError(error)) {
      return this.handleSupabaseError(error);
    }

    // Обработка стандартной ошибки JavaScript
    if (error instanceof Error) {
      return {
        type: this.determineErrorType(error.message),
        message: ERROR_MESSAGES[error.message] || error.message,
        originalError: error,
      };
    }

    // Обработка строковых ошибок
    if (typeof error === 'string') {
      return {
        type: this.determineErrorType(error),
        message: ERROR_MESSAGES[error] || error,
        originalError: error,
      };
    }

    // Обработка прочих ошибок
    return {
      type: 'unknown',
      message: 'Произошла неизвестная ошибка',
      details: error,
      originalError: error,
    };
  }

  /**
   * Проверяет, является ли ошибка уже обработанной
   */
  private static isAppError(error: any): error is AppError {
    return error && typeof error === 'object' && 'type' in error && 'message' in error;
  }

  /**
   * Проверяет, является ли ошибка ошибкой Supabase
   */
  private static isSupabaseError(error: any): boolean {
    return error && typeof error === 'object' && ('status' in error || 'code' in error);
  }

  /**
   * Обрабатывает ошибки Supabase
   */
  private static handleSupabaseError(error: any): AppError {
    const { message, code, status } = error;

    // Определение типа ошибки на основе кода или статуса
    let errorType: AppError['type'] = 'unknown';
    if (status === 401 || code === '42501') {
      errorType = 'authentication';
    } else if (status === 403 || code === 'P0001') {
      errorType = 'authorization';
    } else if (status >= 400 && status < 500) {
      errorType = 'validation';
    } else if (status >= 500) {
      errorType = 'server';
    } else if (status === 0 || !status) {
      errorType = 'network';
    }

    // Возвращаем пользовательское сообщение, если оно есть
    const userMessage = ERROR_MESSAGES[message] || message;

    return {
      type: errorType,
      message: userMessage,
      code,
      details: { status, code },
      originalError: error,
    };
  }

  /**
   * Определяет тип ошибки на основе сообщения
   */
  private static determineErrorType(message: string): AppError['type'] {
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('auth') || lowerMsg.includes('session') || lowerMsg.includes('jwt')) {
      return 'authentication';
    } else if (lowerMsg.includes('permission') || lowerMsg.includes('access') || lowerMsg.includes('forbidden')) {
      return 'authorization';
    } else if (lowerMsg.includes('network') || lowerMsg.includes('fetch') || lowerMsg.includes('connect')) {
      return 'network';
    } else if (lowerMsg.includes('validate') || lowerMsg.includes('invalid') || lowerMsg.includes('required')) {
      return 'validation';
    } else if (lowerMsg.includes('server') || lowerMsg.includes('internal') || lowerMsg.includes('database')) {
      return 'server';
    } else {
      return 'unknown';
    }
  }

  /**
   * Логирует ошибку в консоль
   */
  static logError(error: AppError, context?: string): void {
    console.group(`%cОшибка${context ? ` (${context})` : ''}`, 'color: #ff0000; font-weight: bold;');
    console.error('Тип:', error.type);
    console.error('Сообщение:', error.message);
    if (error.code) console.error('Код:', error.code);
    if (error.details) console.error('Детали:', error.details);
    if (error.originalError) console.error('Оригинальная ошибка:', error.originalError);
    console.groupEnd();
  }

 /**
   * Возвращает пользовательское сообщение об ошибке
   */
  static getUserMessage(error: AppError): string {
    return error.message;
  }
}

/**
 * Глобальный обработчик ошибок
 */
export class GlobalErrorHandler {
  private static handlers: Array<(error: AppError) => void> = [];

  /**
   * Добавляет обработчик ошибок
   */
  static addHandler(handler: (error: AppError) => void): void {
    this.handlers.push(handler);
 }

  /**
   * Удаляет обработчик ошибок
   */
  static removeHandler(handler: (error: AppError) => void): void {
    const index = this.handlers.indexOf(handler);
    if (index > -1) {
      this.handlers.splice(index, 1);
    }
  }

  /**
   * Вызывает все зарегистрированные обработчики ошибок
   */
 static handleError(error: AppError): void {
    this.handlers.forEach(handler => {
      try {
        handler(error);
      } catch (handlerError) {
        console.error('Ошибка в обработчике ошибок:', handlerError);
      }
    });
  }
}

/**
 * Обработчик ошибок авторизации
 */
export class AuthErrorHandler {
  /**
   * Проверяет, является ли ошибка ошибкой авторизации
   */
  static isAuthError(error: AppError): boolean {
    return error.type === 'authentication' || error.type === 'authorization';
  }

  /**
   * Обрабатывает ошибки авторизации
   */
 static handleAuthError(error: AppError): void {
    if (this.isAuthError(error)) {
      // Логируем ошибку авторизации
      console.warn('Ошибка авторизации/аутентификации:', error.message);
      
      // В зависимости от типа ошибки можно выполнить разные действия
      if (error.type === 'authentication') {
        // Ошибка аутентификации - возможно, сессия истекла
        console.log('Сессия пользователя истекла или недействительна');
        // Здесь можно выполнить перенаправление на страницу входа
        // window.location.href = '/login';
      } else if (error.type === 'authorization') {
        // Ошибка авторизации - доступ запрещен
        console.log('Недостаточно прав для выполнения операции');
        // Здесь можно показать сообщение пользователю
      }
    }
  }
}