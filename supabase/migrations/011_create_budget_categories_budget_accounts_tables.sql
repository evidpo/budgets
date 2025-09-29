-- Создание таблиц BUDGET_CATEGORIES и BUDGET_ACCOUNTS

-- Таблица BUDGET_CATEGORIES для связи бюджетов и категорий
CREATE TABLE IF NOT EXISTS budget_categories (
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (budget_id, category_id)
);

-- Таблица BUDGET_ACCOUNTS для связи бюджетов и счетов
CREATE TABLE IF NOT EXISTS budget_accounts (
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (budget_id, account_id)
);

-- Индексы для ускорения поиска
CREATE INDEX idx_budget_categories_category_id ON budget_categories(category_id);
CREATE INDEX idx_budget_accounts_account_id ON budget_accounts(account_id);