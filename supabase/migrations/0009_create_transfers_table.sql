-- Создание таблицы TRANSFERS для связи пары транзакций

CREATE TABLE IF NOT EXISTS transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_tx_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  to_tx_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  UNIQUE(from_tx_id),
  UNIQUE(to_tx_id)
);

-- Индексы для ускорения поиска
CREATE INDEX idx_transfers_from_tx_id ON transfers(from_tx_id);
CREATE INDEX idx_transfers_to_tx_id ON transfers(to_tx_id);

-- Триггеры для автоматического обновления времени и версии
CREATE OR REPLACE FUNCTION update_updated_at_and_version_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_transfers_updated_at_version 
    BEFORE UPDATE ON transfers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_and_version_column();

-- Обновление внешнего ключа в таблице transactions для transfer_id
-- Удаляем старое ограничение и создаем новое, ссылающееся на transfers
DO $$
BEGIN
    -- Удаляем старое ограничение
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'transactions_transfer_id_fkey') THEN
        ALTER TABLE transactions DROP CONSTRAINT transactions_transfer_id_fkey;
    END IF;
    
    -- Создаем новое ограничение, ссылающееся на transfers
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'transactions_transfer_id_fkey_new') THEN
        ALTER TABLE transactions ADD CONSTRAINT transactions_transfer_id_fkey_new FOREIGN KEY (transfer_id) REFERENCES transfers(id) ON DELETE SET NULL;
    END IF;
END $$;