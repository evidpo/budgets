-- Создание индексов для производительности

-- Индексы для таблицы transactions (самой часто используемой)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_household_date_desc ON transactions(household_id, date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_debt_id ON transactions(debt_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_transfer_id ON transactions(transfer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_member_id ON transactions(member_id);

-- Индексы для таблицы accounts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accounts_household_sort_order ON accounts(household_id, sort_order NULLS LAST, name);

-- Индексы для таблицы categories
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_household_path ON categories(household_id, path);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- Индексы для таблицы budgets
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_budgets_household_sort_order ON budgets(household_id, sort_order NULLS LAST, name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_budgets_period ON budgets(period);

-- Индексы для таблицы rules
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rules_household_type_active ON rules(household_id, type, is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rules_priority ON rules(priority);

-- Индексы для таблицы members
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_members_household_user ON members(household_id, user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_members_role ON members(role);

-- Индексы для связующих таблиц
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_budget_categories_budget_id ON budget_categories(budget_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_budget_categories_category_id ON budget_categories(category_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_budget_accounts_budget_id ON budget_accounts(budget_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_budget_accounts_account_id ON budget_accounts(account_id);

-- Индексы для таблицы transfers
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transfers_from_tx_id ON transfers(from_tx_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transfers_to_tx_id ON transfers(to_tx_id);