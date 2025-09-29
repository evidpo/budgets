// Валидация входных данных для API функций
import { errorResponse } from './utils.ts';

// Определение схем валидации
export const validationSchemas = {
  // Схема для создания/обновления счета
  account: {
    name: { type: 'string', required: true, maxLength: 255 },
    type: { type: 'string', required: true, enum: ['cash', 'checking', 'savings', 'credit_card', 'investment', 'card', 'credit', 'other'] },
    currency: { type: 'string', required: false, pattern: /^[A-Z]{3}$/, default: 'EUR' },
    opening_balance: { type: 'number', required: false, default: 0 },
    is_archived: { type: 'boolean', required: false, default: false },
    note: { type: 'string', required: false, maxLength: 500 },
    sort_order: { type: 'number', required: false }
  },
  
  // Схема для создания/обновления транзакции
  transaction: {
    account_id: { type: 'string', required: true, format: 'uuid' },
    amount: { type: 'number', required: true, min: -Number.MAX_VALUE, max: Number.MAX_VALUE },
    description: { type: 'string', required: false, maxLength: 500 },
    category_id: { type: 'string', required: false, format: 'uuid' },
    date: { type: 'string', required: false, format: 'date' },
    payee: { type: 'string', required: false, maxLength: 255 },
    note: { type: 'string', required: false, maxLength: 500 },
    debt_id: { type: 'string', required: false, format: 'uuid' },
    transfer_id: { type: 'string', required: false, format: 'uuid' },
    member_id: { type: 'string', required: false, format: 'uuid' }
  },
  
  // Схема для создания перевода
  transfer: {
    from_account_id: { type: 'string', required: true, format: 'uuid' },
    to_account_id: { type: 'string', required: true, format: 'uuid' },
    amount: { type: 'number', required: true, min: 0.01, max: Number.MAX_VALUE },
    description: { type: 'string', required: false, maxLength: 500 },
    date: { type: 'string', required: false, format: 'date' },
    payee: { type: 'string', required: false, maxLength: 255 },
    note: { type: 'string', required: false, maxLength: 500 },
    member_id: { type: 'string', required: false, format: 'uuid' }
  },
  
  // Схема для создания/обновления бюджета
 budget: {
    name: { type: 'string', required: true, maxLength: 255 },
    amount: { type: 'number', required: true, min: 0.01, max: Number.MAX_VALUE },
    period: { type: 'string', required: true, enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'] },
    start_date: { type: 'string', required: true, format: 'date' },
    end_date: { type: 'string', required: true, format: 'date' },
    direction: { type: 'string', required: true, enum: ['expense', 'income'] },
    rollover: { type: 'boolean', required: false, default: false },
    include_subtree: { type: 'boolean', required: false, default: false },
    sort_order: { type: 'number', required: false },
    category_id: { type: 'string', required: false, format: 'uuid' }
  },
  
  // Схема для создания/обновления категории
  category: {
    name: { type: 'string', required: true, maxLength: 255 },
    type: { type: 'string', required: true, enum: ['income', 'expense'] },
    parent_id: { type: 'string', required: false, format: 'uuid' },
    icon: { type: 'string', required: false, maxLength: 50 },
    color: { type: 'string', required: false, pattern: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/ }
  },
  
  // Схема для создания/обновления долга
  debt: {
    name: { type: 'string', required: true, maxLength: 255 },
    counterparty: { type: 'string', required: false, maxLength: 255 },
    amount: { type: 'number', required: true, min: 0.01, max: Number.MAX_VALUE },
    opening_balance: { type: 'number', required: false, default: 0 },
    interest_rate: { type: 'number', required: false, min: 0, max: 100 },
    minimum_payment: { type: 'number', required: false },
    start_date: { type: 'string', required: false, format: 'date' },
    end_date: { type: 'string', required: false, format: 'date' },
    note: { type: 'string', required: false, maxLength: 500 }
 },
  
  // Схема для создания/обновления правила
  rule: {
    type: { type: 'string', required: true, enum: ['payee', 'regex', 'amount_pattern'] },
    priority: { type: 'number', required: true, min: 0 },
    category_id: { type: 'string', required: true, format: 'uuid' },
    pattern: { type: 'string', required: false, maxLength: 500 },
    is_active: { type: 'boolean', required: false, default: true }
  }
};

// Функция валидации данных
export function validateData(data: any, schema: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const field in schema) {
    const fieldSchema = schema[field];
    const value = data[field];
    
    // Проверка обязательных полей
    if (fieldSchema.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field '${field}' is required`);
      continue;
    }
    
    // Если поле не обязательно и отсутствует, пропускаем его
    if (value === undefined || value === null) {
      continue;
    }
    
    // Проверка типа
    if (fieldSchema.type) {
      let isValidType = false;
      
      switch (fieldSchema.type) {
        case 'string':
          isValidType = typeof value === 'string';
          break;
        case 'number':
          isValidType = typeof value === 'number' && !isNaN(value);
          break;
        case 'boolean':
          isValidType = typeof value === 'boolean';
          break;
        case 'object':
          isValidType = typeof value === 'object' && value !== null && !Array.isArray(value);
          break;
        case 'array':
          isValidType = Array.isArray(value);
          break;
        default:
          isValidType = true; // Пропускаем проверку типа, если тип неизвестен
      }
      
      if (!isValidType) {
        errors.push(`Field '${field}' must be of type ${fieldSchema.type}`);
        continue;
      }
    }
    
    // Проверка enum
    if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
      errors.push(`Field '${field}' must be one of: ${fieldSchema.enum.join(', ')}`);
      continue;
    }
    
    // Проверка минимального значения для чисел
    if (fieldSchema.type === 'number' && fieldSchema.min !== undefined && value < fieldSchema.min) {
      errors.push(`Field '${field}' must be at least ${fieldSchema.min}`);
      continue;
    }
    
    // Проверка максимального значения для чисел
    if (fieldSchema.type === 'number' && fieldSchema.max !== undefined && value > fieldSchema.max) {
      errors.push(`Field '${field}' must be at most ${fieldSchema.max}`);
      continue;
    }
    
    // Проверка максимальной длины для строк
    if (fieldSchema.type === 'string' && fieldSchema.maxLength !== undefined && value.length > fieldSchema.maxLength) {
      errors.push(`Field '${field}' must be at most ${fieldSchema.maxLength} characters`);
      continue;
    }
    
    // Проверка формата UUID
    if (fieldSchema.format === 'uuid' && !isValidUUID(value)) {
      errors.push(`Field '${field}' must be a valid UUID`);
      continue;
    }
    
    // Проверка формата даты
    if (fieldSchema.format === 'date' && !isValidDate(value)) {
      errors.push(`Field '${field}' must be a valid date (YYYY-MM-DD)`);
      continue;
    }
    
    // Проверка регулярного выражения
    if (fieldSchema.pattern && typeof fieldSchema.pattern === 'string') {
      const regex = new RegExp(fieldSchema.pattern);
      if (!regex.test(value)) {
        errors.push(`Field '${field}' does not match required pattern`);
        continue;
      }
    } else if (fieldSchema.pattern instanceof RegExp) {
      if (!fieldSchema.pattern.test(value)) {
        errors.push(`Field '${field}' does not match required pattern`);
        continue;
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Вспомогательная функция для проверки UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Вспомогательная функция для проверки даты
function isValidDate(dateString: string): boolean {
  // Проверяем формат YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }
  
  // Проверяем, является ли это действительной датой
  const date = new Date(dateString);
  return date.toISOString().split('T')[0] === dateString;
}

// Валидация параметров запроса
export function validateQueryParams(params: URLSearchParams, allowedParams: string[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const paramNames = Array.from(params.keys());
  
  for (const paramName of paramNames) {
    if (!allowedParams.includes(paramName)) {
      errors.push(`Parameter '${paramName}' is not allowed`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}