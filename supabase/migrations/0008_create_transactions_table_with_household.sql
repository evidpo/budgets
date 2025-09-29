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
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'transactions_transfer_id_fkey') THEN
        ALTER TABLE transactions ADD CONSTRAINT transactions_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES transactions(id) ON DELETE SET NULL; -- Это будет обновлено позже для TRANSFERS
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

CREATE OR REPLACE FUNCTION update_transactions_updated_at_and_version_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_transactions_updated_at_version 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_transactions_updated_at_and_version_column();

-- Создание индексов для производительности
CREATE INDEX IF NOT EXISTS idx_transactions_household_id ON transactions(household_id);
CREATE INDEX IF NOT EXISTS idx_transactions_household_date ON transactions(household_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_debt_id ON transactions(debt_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_id ON transactions(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_member_id ON transactions(member_id);