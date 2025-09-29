-- Обновление триггеров для автоматического обновления полей updated_at и version для всех таблиц

-- Универсальная функция для обновления updated_at и version
CREATE OR REPLACE FUNCTION update_updated_at_and_version_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF OLD.version IS NOT NULL THEN
        NEW.version = OLD.version + 1;
    ELSE
        NEW.version = 1;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Обновление триггеров для всех таблиц

-- Таблица households
DROP TRIGGER IF EXISTS update_households_updated_at_version ON households;
CREATE TRIGGER update_households_updated_at_version 
    BEFORE UPDATE ON households 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_and_version_column();

-- Таблица members
DROP TRIGGER IF EXISTS update_members_updated_at_version ON members;
CREATE TRIGGER update_members_updated_at_version 
    BEFORE UPDATE ON members 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_and_version_column();

-- Таблица accounts
DROP TRIGGER IF EXISTS update_accounts_updated_at_version ON accounts;
CREATE TRIGGER update_accounts_updated_at_version 
    BEFORE UPDATE ON accounts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_and_version_column();

-- Таблица categories
DROP TRIGGER IF EXISTS update_categories_updated_at_version ON categories;
CREATE TRIGGER update_categories_updated_at_version 
    BEFORE UPDATE ON categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_and_version_column();

-- Таблица transactions
DROP TRIGGER IF EXISTS update_transactions_updated_at_version ON transactions;
CREATE TRIGGER update_transactions_updated_at_version 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_and_version_column();

-- Таблица budgets
DROP TRIGGER IF EXISTS update_budgets_updated_at_version ON budgets;
CREATE TRIGGER update_budgets_updated_at_version 
    BEFORE UPDATE ON budgets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_and_version_column();

-- Таблица debts
DROP TRIGGER IF EXISTS update_debts_updated_at_version ON debts;
CREATE TRIGGER update_debts_updated_at_version 
    BEFORE UPDATE ON debts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_and_version_column();

-- Таблица transfers
DROP TRIGGER IF EXISTS update_transfers_updated_at_version ON transfers;
CREATE TRIGGER update_transfers_updated_at_version 
    BEFORE UPDATE ON transfers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_and_version_column();

-- Таблица rules
DROP TRIGGER IF EXISTS update_rules_updated_at_version ON rules;
CREATE TRIGGER update_rules_updated_at_version 
    BEFORE UPDATE ON rules 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_and_version_column();

-- Добавление поля version ко всем таблицам, если отсутствует
ALTER TABLE households ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE members ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE debts ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE budget_categories ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE budget_accounts ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;