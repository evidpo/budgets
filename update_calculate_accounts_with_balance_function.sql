-- Обновленная функция calculate_accounts_with_balance с исправленным GROUP BY
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
  GROUP BY a.id, a.household_id, a.name, a.type, a.currency, a.opening_balance, 
           a.is_archived, a.note, a.sort_order, a.created_at, a.updated_at, a.version;
END;
$$ LANGUAGE plpgsql;