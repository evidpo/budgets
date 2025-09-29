-- Создание таблицы RULES для автокатегоризации

CREATE TABLE IF NOT EXISTS rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'payee', 'regex', 'amount_pattern'
  priority INTEGER NOT NULL, -- Приоритет (payee > regex > amount)
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  pattern TEXT, -- Паттерн для поиска (payee name, regex pattern, amount pattern)
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

-- Индексы для ускорения поиска
CREATE INDEX idx_rules_household_id ON rules(household_id);
CREATE INDEX idx_rules_type ON rules(type);
CREATE INDEX idx_rules_is_active ON rules(is_active);
CREATE INDEX idx_rules_priority ON rules(priority);

-- Триггеры для автоматического обновления времени и версии
CREATE OR REPLACE FUNCTION update_updated_at_and_version_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rules_updated_at_version 
    BEFORE UPDATE ON rules 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_and_version_column();