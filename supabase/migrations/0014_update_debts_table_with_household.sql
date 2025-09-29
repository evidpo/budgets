-- Обновление таблицы DEBTS с HOUSEHOLD_ID и дополнительными полями

-- Добавление недостающих полей к существующей таблице
ALTER TABLE debts 
ADD COLUMN IF NOT EXISTS household_id UUID,
ADD COLUMN IF NOT EXISTS counterparty VARCHAR(255),
ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(15, 2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS note TEXT;

-- Добавление внешнего ключа для household_id
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'debts_household_id_fkey') THEN
        ALTER TABLE debts ADD CONSTRAINT debts_household_id_fkey FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Добавление поля version
ALTER TABLE debts ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Обновление триггеров
DROP TRIGGER IF EXISTS update_debts_updated_at ON debts;

CREATE OR REPLACE FUNCTION update_debts_updated_at_and_version_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_debts_updated_at_version 
    BEFORE UPDATE ON debts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_debts_updated_at_and_version_column();

-- Создание индексов для производительности
CREATE INDEX IF NOT EXISTS idx_debts_household_id ON debts(household_id);