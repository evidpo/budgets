-- Обновление таблицы ACCOUNTS с HOUSEHOLD_ID и дополнительными полями

-- Добавление недостающих полей к существующей таблице
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS household_id UUID,
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(15, 2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT NULL;

-- Добавление внешнего ключа для household_id
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'accounts_household_id_fkey') THEN
        ALTER TABLE accounts ADD CONSTRAINT accounts_household_id_fkey FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Добавление поля version
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Обновление триггеров
DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;

CREATE OR REPLACE FUNCTION update_accounts_updated_at_and_version_column()
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
    EXECUTE FUNCTION update_accounts_updated_at_and_version_column();

-- Создание индексов для производительности
CREATE INDEX IF NOT EXISTS idx_accounts_household_id ON accounts(household_id);
CREATE INDEX IF NOT EXISTS idx_accounts_household_sort_order ON accounts(household_id, sort_order NULLS LAST, name);