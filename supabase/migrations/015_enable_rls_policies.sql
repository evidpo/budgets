-- Включение RLS (Row Level Security) для всех таблиц

-- Включение RLS для таблиц
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;

-- Создание политик доступа для таблиц

-- Политики для households
CREATE POLICY households_select_policy ON households
  FOR SELECT TO authenticated
  USING (id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY households_insert_policy ON households
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY households_update_policy ON households
 FOR UPDATE TO authenticated
  USING (id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid() AND role = 'owner'
  ));

CREATE POLICY households_delete_policy ON households
  FOR DELETE TO authenticated
  USING (id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid() AND role = 'owner'
  ));

-- Политики для members
CREATE POLICY members_select_policy ON members
  FOR SELECT TO authenticated
  USING (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY members_insert_policy ON members
  FOR INSERT TO authenticated
  WITH CHECK (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid() AND role = 'owner'
  ));

CREATE POLICY members_update_policy ON members
  FOR UPDATE TO authenticated
  USING (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid() AND role = 'owner'
  ));

CREATE POLICY members_delete_policy ON members
  FOR DELETE TO authenticated
  USING (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid() AND role = 'owner'
  ));

-- Политики для accounts
CREATE POLICY accounts_select_policy ON accounts
  FOR SELECT TO authenticated
  USING (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY accounts_insert_policy ON accounts
  FOR INSERT TO authenticated
  WITH CHECK (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY accounts_update_policy ON accounts
  FOR UPDATE TO authenticated
  USING (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY accounts_delete_policy ON accounts
  FOR DELETE TO authenticated
  USING (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid()
  ));

-- Политики для categories
CREATE POLICY categories_select_policy ON categories
  FOR SELECT TO authenticated
  USING (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY categories_insert_policy ON categories
  FOR INSERT TO authenticated
  WITH CHECK (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY categories_update_policy ON categories
  FOR UPDATE TO authenticated
  USING (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY categories_delete_policy ON categories
  FOR DELETE TO authenticated
  USING (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid()
  ));

-- Политики для transactions
CREATE POLICY transactions_select_policy ON transactions
 FOR SELECT TO authenticated
  USING (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY transactions_insert_policy ON transactions
 FOR INSERT TO authenticated
  WITH CHECK (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY transactions_update_policy ON transactions
  FOR UPDATE TO authenticated
  USING (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY transactions_delete_policy ON transactions
  FOR DELETE TO authenticated
  USING (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid()
  ));

-- Политики для budgets
CREATE POLICY budgets_select_policy ON budgets
  FOR SELECT TO authenticated
  USING (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY budgets_insert_policy ON budgets
  FOR INSERT TO authenticated
  WITH CHECK (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY budgets_update_policy ON budgets
 FOR UPDATE TO authenticated
  USING (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY budgets_delete_policy ON budgets
  FOR DELETE TO authenticated
  USING (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid()
  ));

-- Политики для debts
CREATE POLICY debts_select_policy ON debts
  FOR SELECT TO authenticated
  USING (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY debts_insert_policy ON debts
  FOR INSERT TO authenticated
  WITH CHECK (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid()
 ));

CREATE POLICY debts_update_policy ON debts
  FOR UPDATE TO authenticated
  USING (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY debts_delete_policy ON debts
  FOR DELETE TO authenticated
  USING (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid()
  ));

-- Политики для transfers
CREATE POLICY transfers_select_policy ON transfers
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.id = transfers.from_tx_id AND t.household_id IN (
      SELECT household_id FROM members 
      WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY transfers_insert_policy ON transfers
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.id = transfers.from_tx_id AND t.household_id IN (
      SELECT household_id FROM members 
      WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY transfers_update_policy ON transfers
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.id = transfers.from_tx_id AND t.household_id IN (
      SELECT household_id FROM members 
      WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY transfers_delete_policy ON transfers
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.id = transfers.from_tx_id AND t.household_id IN (
      SELECT household_id FROM members 
      WHERE user_id = auth.uid()
    )
  ));

-- Политики для budget_categories
CREATE POLICY budget_categories_select_policy ON budget_categories
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM budgets b
    WHERE b.id = budget_categories.budget_id AND b.household_id IN (
      SELECT household_id FROM members 
      WHERE user_id = auth.uid()
    )
 ));

CREATE POLICY budget_categories_insert_policy ON budget_categories
 FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM budgets b
    WHERE b.id = budget_categories.budget_id AND b.household_id IN (
      SELECT household_id FROM members 
      WHERE user_id = auth.uid()
    )
 ));

CREATE POLICY budget_categories_update_policy ON budget_categories
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM budgets b
    WHERE b.id = budget_categories.budget_id AND b.household_id IN (
      SELECT household_id FROM members 
      WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY budget_categories_delete_policy ON budget_categories
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM budgets b
    WHERE b.id = budget_categories.budget_id AND b.household_id IN (
      SELECT household_id FROM members 
      WHERE user_id = auth.uid()
    )
  ));

-- Политики для budget_accounts
CREATE POLICY budget_accounts_select_policy ON budget_accounts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM budgets b
    WHERE b.id = budget_accounts.budget_id AND b.household_id IN (
      SELECT household_id FROM members 
      WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY budget_accounts_insert_policy ON budget_accounts
 FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM budgets b
    WHERE b.id = budget_accounts.budget_id AND b.household_id IN (
      SELECT household_id FROM members 
      WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY budget_accounts_update_policy ON budget_accounts
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM budgets b
    WHERE b.id = budget_accounts.budget_id AND b.household_id IN (
      SELECT household_id FROM members 
      WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY budget_accounts_delete_policy ON budget_accounts
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM budgets b
    WHERE b.id = budget_accounts.budget_id AND b.household_id IN (
      SELECT household_id FROM members 
      WHERE user_id = auth.uid()
    )
  ));

-- Политики для rules
CREATE POLICY rules_select_policy ON rules
  FOR SELECT TO authenticated
  USING (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY rules_insert_policy ON rules
  FOR INSERT TO authenticated
  WITH CHECK (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY rules_update_policy ON rules
  FOR UPDATE TO authenticated
  USING (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY rules_delete_policy ON rules
  FOR DELETE TO authenticated
  USING (household_id IN (
    SELECT household_id FROM members 
    WHERE user_id = auth.uid()
  ));