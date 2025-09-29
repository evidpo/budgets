-- Обновление таблицы CATEGORIES с поддержкой иерархии и HOUSEHOLD_ID

-- Добавление поля household_id к существующей таблице
ALTER TABLE categories ADD COLUMN IF NOT EXISTS household_id UUID;

-- Добавление внешнего ключа для household_id
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'categories_household_id_fkey') THEN
        ALTER TABLE categories ADD CONSTRAINT categories_household_id_fkey FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Обновление структуры таблицы CATEGORIES в соответствии с PRD
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS parent_id UUID,
ADD COLUMN IF NOT EXISTS path VARCHAR(500),
ADD COLUMN IF NOT EXISTS icon VARCHAR(50),
ADD COLUMN IF NOT EXISTS color VARCHAR(7); -- HEX цвет в формате #RRGGBB

-- Добавление индекса для иерархии
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_household_path ON categories(household_id, path);

-- Обновление триггеров для увеличения версии при обновлении
-- Сначала удаляем старые триггеры
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;

-- Добавляем поле version
ALTER TABLE categories ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Создаем обновленный триггер
CREATE OR REPLACE FUNCTION update_categories_updated_at_and_version_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_categories_updated_at_version 
    BEFORE UPDATE ON categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_categories_updated_at_and_version_column();

-- Создание индексов для производительности
CREATE INDEX IF NOT EXISTS idx_categories_household_id ON categories(household_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);