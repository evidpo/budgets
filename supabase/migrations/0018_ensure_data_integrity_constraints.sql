-- Обеспечение целостности данных с помощью внешних ключей и ограничений

-- Добавление ограничений для таблицы accounts
ALTER TABLE accounts 
ADD CONSTRAINT accounts_type_check CHECK (type IN ('cash', 'checking', 'savings', 'credit_card', 'investment', 'card', 'credit', 'other'));

-- Добавление ограничений для таблицы categories
ALTER TABLE categories 
ADD CONSTRAINT categories_type_check CHECK (type IN ('income', 'expense'));

-- Добавление ограничений для таблицы transactions
ALTER TABLE transactions 
ADD CONSTRAINT transactions_type_check CHECK (type IN ('income', 'expense')),
ADD CONSTRAINT transactions_amount_check CHECK (amount != 0); -- Сумма транзакции не может быть нулевой

-- Добавление ограничений для таблицы budgets
ALTER TABLE budgets 
ADD CONSTRAINT budgets_period_type_check CHECK (period IN ('daily', 'weekly', 'monthly', 'yearly', 'custom')),
ADD CONSTRAINT budgets_direction_check CHECK (direction IN ('expense', 'income')),
ADD CONSTRAINT budgets_amount_check CHECK (amount >= 0); -- Лимит бюджета не может быть отрицательным

-- Добавление ограничений для таблицы members
ALTER TABLE members 
ADD CONSTRAINT members_role_check CHECK (role IN ('owner', 'editor', 'viewer'));

-- Добавление ограничений для таблицы rules
ALTER TABLE rules 
ADD CONSTRAINT rules_type_check CHECK (type IN ('payee', 'regex', 'amount_pattern')),
ADD CONSTRAINT rules_priority_check CHECK (priority >= 0);

-- Добавление ограничений для таблицы debts
ALTER TABLE debts 
ADD CONSTRAINT debts_interest_rate_check CHECK (interest_rate >= 0 AND interest_rate <= 100),
ADD CONSTRAINT debts_minimum_payment_check CHECK (minimum_payment >= 0);

-- Добавление ограничений для поля currency в таблице accounts
ALTER TABLE accounts 
ADD CONSTRAINT accounts_currency_check CHECK (char_length(currency) = 3); -- ISO 4217 currency code format

-- Добавление ограничений для поля color в таблице categories
ALTER TABLE categories 
ADD CONSTRAINT categories_color_format_check CHECK (color ~ '^#([A-Fa-f0-9]{6})$'); -- Проверка формата HEX цвета

-- Обновление ограничений для поля date в таблице transactions
ALTER TABLE transactions 
ADD CONSTRAINT transactions_date_check CHECK (date <= NOW() + INTERVAL '1 day'); -- Дата транзакции не может быть в далеком будущем