import { z } from 'zod';

// Схемы валидации для сущностей приложения семейных финансов

// Схема для Account
export const accountSchema = z.object({
  id: z.string().optional(),
  household_id: z.string().uuid(),
  name: z.string()
    .min(1, 'Название обязательно')
    .max(255, 'Название не должно превышать 255 символов'),
  type: z.enum(['cash', 'checking', 'savings', 'credit_card', 'investment', 'card', 'credit', 'other']),
  balance: z.number().min(0, 'Баланс не может быть отрицательным').optional(),
  currency: z.string().min(1, 'Валюта обязательна').max(3, 'Код валюты должен состоять из 3 символов'),
  opening_balance: z.number().optional(),
  is_archived: z.boolean().optional(),
  note: z.string().max(1000, 'Заметка не должна превышать 1000 символов').optional(),
  sort_order: z.number().int().optional(),
  created_at: z.string().datetime().optional(),
 updated_at: z.string().datetime().optional(),
  version: z.number().int().optional(),
});

export const createAccountSchema = accountSchema.omit({ 
  id: true, 
  balance: true, 
  created_at: true, 
  updated_at: true, 
  version: true 
});

export const updateAccountSchema = accountSchema.partial().omit({ 
  id: true, 
  household_id: true 
});

// Схема для Category
export const categorySchema = z.object({
  id: z.string().uuid(),
  household_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable().optional(),
  name: z.string()
    .min(1, 'Название обязательно')
    .max(255, 'Название не должно превышать 255 символов'),
  type: z.enum(['income', 'expense']),
  path: z.string().max(1000, 'Путь не должен превышать 1000 символов').optional(),
  icon: z.string().max(100, 'Иконка не должна превышать 100 символов').optional(),
  color: z.string().max(7, 'Цвет должен быть в формате #RRGGBB').regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Неверный формат цвета').optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  version: z.number().int().optional(),
});

export const createCategorySchema = categorySchema.omit({ 
  id: true, 
  path: true, 
  created_at: true, 
  updated_at: true, 
  version: true 
}).partial({ color: true, icon: true });

export const updateCategorySchema = categorySchema.partial().omit({ 
  id: true, 
  household_id: true 
});

// Схема для Transaction
export const transactionSchema = z.object({
  id: z.string().uuid(),
  household_id: z.string().uuid(),
  user_id: z.string().uuid(),
  account_id: z.string().uuid(),
  category_id: z.string().uuid().nullable().optional(),
  description: z.string().max(1000, 'Описание не должно превышать 1000 символов').optional(),
  amount: z.number().min(0.01, 'Сумма должна быть больше 0'),
  type: z.enum(['income', 'expense']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате YYYY-MM-DD'),
  payee: z.string().max(255, 'Получатель не должен превышать 255 символов').optional(),
  note: z.string().max(1000, 'Заметка не должна превышать 1000 символов').optional(),
  debt_id: z.string().uuid().nullable().optional(),
  transfer_id: z.string().uuid().nullable().optional(),
  member_id: z.string().uuid().nullable().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  version: z.number().int().optional(),
});

export const createTransactionSchema = transactionSchema.omit({ 
  id: true, 
  created_at: true, 
  updated_at: true, 
  version: true 
}).partial({ 
  id: true, 
  created_at: true, 
  updated_at: true, 
  version: true,
  transfer_id: true 
});

export const updateTransactionSchema = transactionSchema.partial().omit({ 
  id: true, 
  household_id: true,
  user_id: true 
});

// Схема для Budget
export const budgetSchema = z.object({
  id: z.string().uuid(),
  household_id: z.string().uuid(),
  name: z.string()
    .min(1, 'Название обязательно')
    .max(255, 'Название не должно превышать 255 символов'),
  category_id: z.string().uuid().nullable().optional(),
  amount: z.number().min(0.01, 'Сумма бюджета должна быть больше 0'),
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'custom']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата начала должна быть в формате YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата окончания должна быть в формате YYYY-MM-DD'),
  direction: z.enum(['expense', 'income']),
  rollover: z.boolean().optional(),
  include_subtree: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  version: z.number().int().optional(),
});

export const createBudgetSchema = budgetSchema.omit({ 
  id: true, 
  created_at: true, 
  updated_at: true, 
  version: true 
}).partial({ 
  rollover: true, 
  include_subtree: true,
  sort_order: true
});

export const updateBudgetSchema = budgetSchema.partial().omit({ 
  id: true, 
  household_id: true 
});

// Схема для Debt
export const debtSchema = z.object({
  id: z.string().uuid(),
  household_id: z.string().uuid(),
  name: z.string()
    .min(1, 'Название обязательно')
    .max(255, 'Название не должно превышать 255 символов'),
  counterparty: z.string()
    .min(1, 'Контрагент обязателен')
    .max(255, 'Контрагент не должен превышать 255 символов'),
  amount: z.number().min(0.01, 'Сумма долга должна быть больше 0'),
  opening_balance: z.number().min(0, 'Начальный баланс не может быть отрицательным'),
  interest_rate: z.number().min(0).max(100, 'Процентная ставка должна быть от 0 до 100'),
  minimum_payment: z.number().min(0, 'Минимальный платеж не может быть отрицательным').optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата начала должна быть в формате YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата окончания должна быть в формате YYYY-MM-DD').optional(),
  note: z.string().max(1000, 'Заметка не должна превышать 1000 символов').optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  version: z.number().int().optional(),
});

export const createDebtSchema = debtSchema.omit({ 
  id: true, 
  created_at: true, 
  updated_at: true, 
  version: true 
}).partial({ 
 minimum_payment: true,
  end_date: true
});

export const updateDebtSchema = debtSchema.partial().omit({ 
  id: true, 
  household_id: true 
});

// Схема для Rule
export const ruleSchema = z.object({
  id: z.string().uuid(),
  household_id: z.string().uuid(),
  type: z.enum(['payee', 'regex', 'amount_pattern']),
  priority: z.number().int().min(0, 'Приоритет должен быть неотрицательным'),
  category_id: z.string().uuid(),
  pattern: z.string()
    .min(1, 'Шаблон обязателен')
    .max(1000, 'Шаблон не должен превышать 1000 символов'),
  is_active: z.boolean(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  version: z.number().int().optional(),
});

export const createRuleSchema = ruleSchema.omit({ 
  id: true, 
  created_at: true, 
  updated_at: true, 
  version: true 
});

export const updateRuleSchema = ruleSchema.partial().omit({ 
  id: true, 
  household_id: true 
});

// Экспорты для использования в формах
export type AccountFormData = z.infer<typeof createAccountSchema>;
export type UpdateAccountFormData = z.infer<typeof updateAccountSchema>;
export type CategoryFormData = z.infer<typeof createCategorySchema>;
export type UpdateCategoryFormData = z.infer<typeof updateCategorySchema>;
export type TransactionFormData = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionFormData = z.infer<typeof updateTransactionSchema>;
export type BudgetFormData = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetFormData = z.infer<typeof updateBudgetSchema>;
export type DebtFormData = z.infer<typeof createDebtSchema>;
export type UpdateDebtFormData = z.infer<typeof updateDebtSchema>;
export type RuleFormData = z.infer<typeof createRuleSchema>;
export type UpdateRuleFormData = z.infer<typeof updateRuleSchema>;