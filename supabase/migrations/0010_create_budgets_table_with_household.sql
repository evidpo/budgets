-- Обновление таблицы BUDGETS с HOUSEHOLD_ID и дополнительными полями

-- Добавление недостающих полей к существующей таблице
ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS household_id UUID,
ADD COLUMN IF NOT EXISTS direction VARCHAR(10), -- 'expense' или 'income'
ADD COLUMN IF NOT EXISTS rollover BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS include_subtree BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT NULL;

-- Добавление внешнего ключа для household_id
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'budgets_household_id_fkey') THEN
        ALTER TABLE budgets ADD CONSTRAINT budgets_household_id_fkey FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Обновление внешнего ключа для category_id
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'budgets_category_id_fkey') THEN
        ALTER TABLE budgets ADD CONSTRAINT budgets_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Добавление поля version
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Обновление триггеров
DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;

CREATE OR REPLACE FUNCTION update_budgets_updated_at_and_version_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_budgets_updated_at_version 
    BEFORE UPDATE ON budgets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_budgets_updated_at_and_version_column();

-- Создание индексов для производительности
CREATE INDEX IF NOT EXISTS idx_budgets_household_id ON budgets(household_id);
CREATE INDEX IF NOT EXISTS idx_budgets_household_sort_order ON budgets(household_id, sort_order NULLS LAST, name);