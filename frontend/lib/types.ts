// Типы данных для приложения семейных финансов

export interface Household {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface Member {
  id: string;
  household_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  created_at: string;
  updated_at: string;
  version: number;
}

export interface Account {
  id: string;
  household_id: string;
  name: string;
 type: 'cash' | 'checking' | 'savings' | 'credit_card' | 'investment' | 'card' | 'credit' | 'other';
  balance: number;
  currency: string;
  opening_balance: number;
  is_archived: boolean;
  note: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
 version: number;
}

export interface Category {
  id: string;
  household_id: string;
  parent_id: string | null;
  name: string;
 type: 'income' | 'expense';
  path: string;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface Transaction {
  id: string;
  household_id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  payee: string;
  note: string;
  debt_id: string | null;
  transfer_id: string | null;
  member_id: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface Transfer {
  id: string;
  from_tx_id: string;
  to_tx_id: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface Budget {
  id: string;
  household_id: string;
  name: string;
  category_id: string | null;
  amount: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  start_date: string;
  end_date: string;
  direction: 'expense' | 'income';
  rollover: boolean;
  include_subtree: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface BudgetCategory {
  budget_id: string;
  category_id: string;
  created_at: string;
}

export interface BudgetAccount {
  budget_id: string;
  account_id: string;
  created_at: string;
}

export interface Debt {
  id: string;
  household_id: string;
  name: string;
  counterparty: string;
  amount: number;
  opening_balance: number;
  interest_rate: number;
  minimum_payment: number;
  start_date: string;
  end_date: string;
  note: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface Rule {
  id: string;
  household_id: string;
  type: 'payee' | 'regex' | 'amount_pattern';
  priority: number;
  category_id: string;
  pattern: string;
  is_active: boolean;
  created_at: string;
 updated_at: string;
  version: number;
}

// Типы для API ответов
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  error: string | null;
}

// Типы для фильтров
export interface TransactionFilter {
  from_date?: string;
  to_date?: string;
  account_ids?: string[];
  category_ids?: string[];
  member_id?: string;
  debt_id?: string;
  exclude_transfers?: boolean;
}

export interface BudgetComputeParams {
  as_of: string;
}

// Типы для создания/обновления сущностей
export interface CreateAccountData {
  household_id: string;
 name: string;
 type: Account['type'];
  opening_balance?: number;
  currency?: string;
  note?: string;
}

export interface UpdateAccountData {
  name?: string;
  type?: Account['type'];
  is_archived?: boolean;
  note?: string;
}

export interface CreateTransactionData {
  household_id: string;
 account_id: string;
  amount: number;
  date: string;
  category_id?: string;
  description?: string;
  payee?: string;
  note?: string;
  debt_id?: string;
  member_id?: string;
}

export interface CreateTransferData {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface CreateBudgetData {
  household_id: string;
  name: string;
  amount: number;
 period: Budget['period'];
  start_date: string;
  end_date: string;
  direction: Budget['direction'];
  rollover?: boolean;
  include_subtree?: boolean;
}

export interface UpdateBudgetData {
  name?: string;
  amount?: number;
 period?: Budget['period'];
  start_date?: string;
  end_date?: string;
  direction?: Budget['direction'];
  rollover?: boolean;
  include_subtree?: boolean;
}

export interface CreateCategoryData {
  household_id: string;
 name: string;
  type: Category['type'];
  parent_id?: string | null;
  icon?: string;
  color?: string;
}

export interface UpdateCategoryData {
  name?: string;
  type?: Category['type'];
  parent_id?: string | null;
  icon?: string;
  color?: string;
}

export interface CreateDebtData {
  household_id: string;
  name: string;
  counterparty: string;
  amount: number;
  opening_balance?: number;
  interest_rate?: number;
  minimum_payment?: number;
  start_date?: string;
  end_date?: string;
  note?: string;
}

export interface UpdateDebtData {
  name?: string;
  counterparty?: string;
 amount?: number;
  opening_balance?: number;
  interest_rate?: number;
  minimum_payment?: number;
  start_date?: string;
 end_date?: string;
  note?: string;
}

export interface CreateRuleData {
  household_id: string;
  type: Rule['type'];
  priority: number;
 category_id: string;
  pattern: string;
  is_active: boolean;
}

export interface UpdateRuleData {
  type?: Rule['type'];
  priority?: number;
  category_id?: string;
  pattern?: string;
  is_active?: boolean;
}

// Типы для ответов вычислений
export interface BudgetComputeResult {
  budget_id: string;
 spent: number;
  income: number;
  available: number;
  carry_prev: number;
  limit: number;
}