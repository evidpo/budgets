-- Схема базы данных для облачного Supabase проекта

-- 0001_create_accounts_table.sql
CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'cash', 'checking', 'savings', 'credit_card', 'investment'
  currency VARCHAR(3) DEFAULT 'EUR',
  opening_balance DECIMAL(15, 2) DEFAULT 0.0,
  is_archived BOOLEAN DEFAULT FALSE,
  note TEXT,
  sort_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 version INTEGER DEFAULT 1
);

-- Индексы для ускорения поиска
CREATE INDEX IF NOT EXISTS idx_accounts_household_id ON accounts(household_id);
CREATE INDEX IF NOT EXISTS idx_accounts_household_sort ON accounts(household_id, sort_order NULLS LAST, name);

-- Временная метка обновления
CREATE OR REPLACE FUNCTION update_updated_at_and_version_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_accounts_updated_at_version 
    BEFORE UPDATE ON accounts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_and_version_column();

-- 006_create_users_households_members_tables.sql
-- Таблица HOUSEHOLDS (домохозяйства)
CREATE TABLE IF NOT EXISTS households (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

-- Таблица MEMBERS (участники домохозяйства)
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'viewer', -- 'owner', 'editor', 'viewer'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  UNIQUE(household_id, user_id)
);

-- Индексы для ускорения поиска
CREATE INDEX IF NOT EXISTS idx_households_created_at ON households(created_at);
CREATE INDEX IF NOT EXISTS idx_members_household_id ON members(household_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_role ON members(role);

-- Триггеры для автоматического обновления времени
CREATE TRIGGER update_households_updated_at_version 
    BEFORE UPDATE ON households 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_and_version_column();

CREATE TRIGGER update_members_updated_at_version 
    BEFORE UPDATE ON members 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_and_version_column();

-- 007_create_categories_table_with_hierarchy.sql
-- Таблица CATEGORIES (категории с иерархией)
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  path TEXT NOT NULL, -- хранит путь вида 'Root:Child:Sub'
  type VARCHAR(20) NOT NULL, -- 'income' или 'expense'
  icon VARCHAR(50), -- имя иконки
  color VARCHAR(7), -- цвет в формате #RRGGBB
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

-- Индекс для ускорения поиска по иерархии
CREATE INDEX IF NOT EXISTS idx_categories_household_path ON categories(household_id, path);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

CREATE TRIGGER update_categories_updated_at_version 
    BEFORE UPDATE ON categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_and_version_column();

-- 008_create_transactions_table_with_household.sql
-- Обновление таблицы TRANSACTIONS с HOUSEHOLD_ID и дополнительными полями
-- Добавление недостающих полей к существующей таблице
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS household_id UUID,
ADD COLUMN IF NOT EXISTS payee VARCHAR(255),
ADD COLUMN IF NOT EXISTS debt_id UUID,
ADD COLUMN IF NOT EXISTS transfer_id UUID,
ADD COLUMN IF NOT EXISTS member_id UUID;

-- Добавление внешних ключей
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'transactions_household_id_fkey') THEN
        ALTER TABLE transactions ADD CONSTRAINT transactions_household_id_fkey FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'transactions_debt_id_fkey') THEN
        ALTER TABLE transactions ADD CONSTRAINT transactions_debt_id_fkey FOREIGN KEY (debt_id) REFERENCES debts(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'transactions_member_id_fkey') THEN
        ALTER TABLE transactions ADD CONSTRAINT transactions_member_id_fkey FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Обновление внешнего ключа для account_id
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'transactions_account_id_fkey') THEN
        ALTER TABLE transactions ADD CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Обновление внешнего ключа для category_id
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'transactions_category_id_fkey') THEN
        ALTER TABLE transactions ADD CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Добавление поля version
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Обновление триггеров
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;

CREATE TRIGGER update_transactions_updated_at_version 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_and_version_column();

-- Создание индексов для производительности
CREATE INDEX IF NOT EXISTS idx_transactions_household_id ON transactions(household_id);
CREATE INDEX IF NOT EXISTS idx_transactions_household_date ON transactions(household_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_debt_id ON transactions(debt_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_id ON transactions(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_member_id ON transactions(member_id);

-- 009_create_transfers_table.sql
-- Таблица для связи переводов
CREATE TABLE IF NOT EXISTS transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_tx_id UUID NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
  to_tx_id UUID NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_transfers_from_tx_id ON transfers(from_tx_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_tx_id ON transfers(to_tx_id);

CREATE TRIGGER update_transfers_updated_at_version 
    BEFORE UPDATE ON transfers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_and_version_column();

-- 010_create_budgets_table_with_household.sql
-- Обновление таблицы бюджетов с HOUSEHOLD_ID и дополнительными полями
ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS household_id UUID,
ADD COLUMN IF NOT EXISTS direction VARCHAR(10), -- 'expense' или 'income'
ADD COLUMN IF NOT EXISTS rollover BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS include_subtree BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- Добавление внешнего ключа
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'budgets_household_id_fkey') THEN
        ALTER TABLE budgets ADD CONSTRAINT budgets_household_id_fkey FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Обновление триггеров
DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;

CREATE TRIGGER update_budgets_updated_at_version 
    BEFORE UPDATE ON budgets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_and_version_column();

-- Создание индексов для производительности
CREATE INDEX IF NOT EXISTS idx_budgets_household_id ON budgets(household_id);
CREATE INDEX IF NOT EXISTS idx_budgets_household_sort ON budgets(household_id, sort_order NULLS LAST, name);

-- 11_create_budget_categories_budget_accounts_tables.sql
-- Таблицы для связи бюджетов с категориями и счетами
CREATE TABLE IF NOT EXISTS budget_categories (
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (budget_id, category_id)
);

CREATE TABLE IF NOT EXISTS budget_accounts (
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  PRIMARY KEY (budget_id, account_id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_budget_categories_category_id ON budget_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_budget_accounts_account_id ON budget_accounts(account_id);

-- 012_create_rules_table.sql
-- Таблица для правил автокатегоризации
CREATE TABLE IF NOT EXISTS rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'payee', 'regex', 'amount_pattern'
  priority INTEGER NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  pattern TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_rules_household_id ON rules(household_id);
CREATE INDEX IF NOT EXISTS idx_rules_type ON rules(type);
CREATE INDEX IF NOT EXISTS idx_rules_category_id ON rules(category_id);

-- 014_update_debts_table_with_household.sql
-- Обновление таблицы долгов с HOUSEHOLD_ID
ALTER TABLE debts 
ADD COLUMN IF NOT EXISTS household_id UUID;

-- Добавление внешнего ключа
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'debts_household_id_fkey') THEN
        ALTER TABLE debts ADD CONSTRAINT debts_household_id_fkey FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Обновление триггеров
DROP TRIGGER IF EXISTS update_debts_updated_at ON debts;

CREATE TRIGGER update_debts_updated_at_version 
    BEFORE UPDATE ON debts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_and_version_column();

-- Создание индексов для производительности
CREATE INDEX IF NOT EXISTS idx_debts_household_id ON debts(household_id);

-- 015_enable_rls_policies.sql
-- Включение Row Level Security (RLS) для всех таблиц
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;

-- Создание политик RLS
-- Политики для таблиц с household_id
CREATE POLICY accounts_policy ON accounts FOR ALL TO authenticated USING (household_id IN (SELECT household_id FROM members WHERE user_id = auth.uid()));
CREATE POLICY categories_policy ON categories FOR ALL TO authenticated USING (household_id IN (SELECT household_id FROM members WHERE user_id = auth.uid()));
CREATE POLICY transactions_policy ON transactions FOR ALL TO authenticated USING (household_id IN (SELECT household_id FROM members WHERE user_id = auth.uid()));
CREATE POLICY budgets_policy ON budgets FOR ALL TO authenticated USING (household_id IN (SELECT household_id FROM members WHERE user_id = auth.uid()));
CREATE POLICY debts_policy ON debts FOR ALL TO authenticated USING (household_id IN (SELECT household_id FROM members WHERE user_id = auth.uid()));
CREATE POLICY transfers_policy ON transfers FOR ALL TO authenticated USING (transactions.household_id IN (SELECT household_id FROM members WHERE user_id = auth.uid()) FROM transfers JOIN transactions ON transactions.id = transfers.from_tx_id);
CREATE POLICY budget_categories_policy ON budget_categories FOR ALL TO authenticated USING (budgets.household_id IN (SELECT household_id FROM members WHERE user_id = auth.uid()) FROM budget_categories JOIN budgets ON budgets.id = budget_categories.budget_id);
CREATE POLICY budget_accounts_policy ON budget_accounts FOR ALL TO authenticated USING (budgets.household_id IN (SELECT household_id FROM members WHERE user_id = auth.uid()) FROM budget_accounts JOIN budgets ON budgets.id = budget_accounts.budget_id);
CREATE POLICY rules_policy ON rules FOR ALL TO authenticated USING (household_id IN (SELECT household_id FROM members WHERE user_id = auth.uid()));

-- Политики для таблиц members и households
CREATE POLICY members_policy ON members FOR ALL TO authenticated USING (household_id IN (SELECT household_id FROM members WHERE user_id = auth.uid()));
CREATE POLICY households_policy ON households FOR ALL TO authenticated USING (id IN (SELECT household_id FROM members WHERE user_id = auth.uid()));

-- 016_create_performance_indexes.sql
-- Дополнительные индексы для производительности
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_categories_household_type ON categories(household_id, type);
CREATE INDEX IF NOT EXISTS idx_budgets_household_period ON budgets(household_id, start_date, end_date);

-- 017_update_triggers_for_updated_at_and_version.sql
-- Обновление триггеров для всех таблиц
CREATE OR REPLACE FUNCTION update_updated_at_and_version_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 019_create_computed_functions.sql
-- Функции для вычисления балансов и других значений
CREATE OR REPLACE FUNCTION calculate_accounts_with_balance(household_id_param UUID)
RETURNS TABLE (
  id UUID,
  household_id UUID,
  name VARCHAR(255),
  type VARCHAR(50),
  currency VARCHAR(3),
  opening_balance DECIMAL,
  balance DECIMAL,
  is_archived BOOLEAN,
  note TEXT,
  sort_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.household_id,
    a.name,
    a.type,
    a.currency,
    a.opening_balance,
    a.opening_balance + COALESCE(SUM(t.amount), 0) AS balance,
    a.is_archived,
    a.note,
    a.sort_order,
    a.created_at,
    a.updated_at,
    a.version
 FROM accounts a
 LEFT JOIN transactions t ON t.account_id = a.id
  WHERE a.household_id = household_id_param
  GROUP BY a.id, a.household_id, a.opening_balance;
END;
$$ LANGUAGE plpgsql;

-- Функция для создания перевода (две связанные транзакции)
CREATE OR REPLACE FUNCTION create_transfer(
  from_account_id UUID,
  to_account_id UUID,
  amount DECIMAL,
  transaction_date DATE,
  description TEXT,
  household_id_param UUID,
  member_id_param UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  from_tx_id UUID;
  to_tx_id UUID;
  transfer_id UUID;
  from_category_id UUID;
  to_category_id UUID;
BEGIN
  -- Получаем категории для переводов (можно использовать специальные категории)
  SELECT id INTO from_category_id FROM categories WHERE name = 'Transfer' AND type = 'expense' AND household_id = household_id_param;
  IF from_category_id IS NULL THEN
    INSERT INTO categories (household_id, name, type, path) VALUES (household_id_param, 'Transfer', 'expense', 'Transfer') RETURNING id INTO from_category_id;
  END IF;
  
  SELECT id INTO to_category_id FROM categories WHERE name = 'Transfer' AND type = 'income' AND household_id = household_id_param;
  IF to_category_id IS NULL THEN
    INSERT INTO categories (household_id, name, type, path) VALUES (household_id_param, 'Transfer', 'income', 'Transfer') RETURNING id INTO to_category_id;
  END IF;

  -- Создаем расходную транзакцию
  INSERT INTO transactions (household_id, account_id, category_id, description, amount, type, date, user_id, member_id)
  VALUES (household_id_param, from_account_id, from_category_id, description, -amount, 'expense', transaction_date, auth.uid(), member_id_param)
  RETURNING id INTO from_tx_id;

  -- Создаем доходную транзакцию
 INSERT INTO transactions (household_id, account_id, category_id, description, amount, type, date, user_id, member_id)
  VALUES (household_id_param, to_account_id, to_category_id, description, amount, 'income', transaction_date, auth.uid(), member_id_param)
  RETURNING id INTO to_tx_id;

  -- Создаем запись о переводе
  INSERT INTO transfers (from_tx_id, to_tx_id)
  VALUES (from_tx_id, to_tx_id)
  RETURNING id INTO transfer_id;

  RETURN transfer_id;
END;
$$ LANGUAGE plpgsql;

-- Функция для расчета доступного бюджета
CREATE OR REPLACE FUNCTION calculate_budget_available(budget_id_param UUID, as_of_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  budget_id UUID,
  spent DECIMAL,
  available DECIMAL,
  limit_amount DECIMAL
) AS $$
DECLARE
  budget_record RECORD;
  spent_amount DECIMAL;
  available_amount DECIMAL;
BEGIN
  SELECT * INTO budget_record FROM budgets WHERE id = budget_id_param;
  
  -- Рассчитываем потраченные средства (для расходных бюджетов) или доходы (для доходных бюджетов)
  IF budget_record.direction = 'expense' THEN
    SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO spent_amount
    FROM transactions t
    JOIN budgets b ON b.household_id = t.household_id
    LEFT JOIN budget_categories bc ON bc.budget_id = b.id
    LEFT JOIN budget_accounts ba ON ba.budget_id = b.id
    WHERE t.id NOT IN (SELECT from_tx_id FROM transfers UNION SELECT to_tx_id FROM transfers) -- Исключаем переводы
      AND t.household_id = budget_record.household_id
      AND t.date BETWEEN budget_record.start_date AND budget_record.end_date
      AND t.amount < 0 -- Только расходы
      AND (bc.category_id IS NULL OR t.category_id = bc.category_id OR (budget_record.include_subtree AND EXISTS (
        SELECT 1 FROM categories c WHERE c.id = t.category_id AND c.path LIKE (SELECT path FROM categories WHERE id = bc.category_id) || ':%'
      )))
      AND (ba.account_id IS NULL OR t.account_id = ba.account_id);
  ELSIF budget_record.direction = 'income' THEN
    SELECT COALESCE(SUM(t.amount), 0) INTO spent_amount
    FROM transactions t
    JOIN budgets b ON b.household_id = t.household_id
    LEFT JOIN budget_categories bc ON bc.budget_id = b.id
    LEFT JOIN budget_accounts ba ON ba.budget_id = b.id
    WHERE t.id NOT IN (SELECT from_tx_id FROM transfers UNION SELECT to_tx_id FROM transfers) -- Исключаем переводы
      AND t.household_id = budget_record.household_id
      AND t.date BETWEEN budget_record.start_date AND budget_record.end_date
      AND t.amount > 0 -- Только доходы
      AND (bc.category_id IS NULL OR t.category_id = bc.category_id OR (budget_record.include_subtree AND EXISTS (
        SELECT 1 FROM categories c WHERE c.id = t.category_id AND c.path LIKE (SELECT path FROM categories WHERE id = bc.category_id) || ':%'
      )))
      AND (ba.account_id IS NULL OR t.account_id = ba.account_id);
  END IF;

  -- Рассчитываем доступную сумму
  IF budget_record.rollover THEN
    -- С учетом переноса остатка
    available_amount := budget_record.amount - COALESCE(spent_amount, 0);
  ELSE
    -- Без переноса
    available_amount := budget_record.amount - COALESCE(spent_amount, 0);
  END IF;

  RETURN QUERY
  SELECT budget_id_param, COALESCE(spent_amount, 0), available_amount, budget_record.amount;
END;
$$ LANGUAGE plpgsql;