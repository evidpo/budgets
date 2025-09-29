-- Создание функций для вычисления балансов счетов и других вычисляемых значений

-- Функция для вычисления баланса счета
CREATE OR REPLACE FUNCTION calculate_account_balance(p_account_id UUID)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
    balance DECIMAL(15, 2);
BEGIN
    SELECT COALESCE(SUM(amount), 0) + COALESCE((SELECT opening_balance FROM accounts WHERE id = p_account_id), 0)
    INTO balance
    FROM transactions
    WHERE account_id = p_account_id;
    
    RETURN balance;
END;
$$ LANGUAGE plpgsql;

-- Функция для вычисления остатка по долгам
CREATE OR REPLACE FUNCTION calculate_debt_balance(p_debt_id UUID)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
    balance DECIMAL(15, 2);
BEGIN
    SELECT COALESCE(SUM(amount), 0) + COALESCE((SELECT opening_balance FROM debts WHERE id = p_debt_id), 0)
    INTO balance
    FROM transactions
    WHERE debt_id = p_debt_id;
    
    RETURN balance;
END;
$$ LANGUAGE plpgsql;

-- Функция для вычисления потраченной суммы по бюджету (только расходы, исключая переводы)
CREATE OR REPLACE FUNCTION calculate_budget_spent(p_budget_id UUID, p_as_of DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
    spent DECIMAL(15, 2);
BEGIN
    WITH budget_filters AS (
        SELECT 
            b.id,
            b.household_id,
            b.direction,
            b.period,
            b.start_date,
            b.end_date,
            bc.category_id,
            ba.account_id
        FROM budgets b
        LEFT JOIN budget_categories bc ON b.id = bc.budget_id
        LEFT JOIN budget_accounts ba ON b.id = ba.budget_id
        WHERE b.id = p_budget_id
    ),
    eligible_transactions AS (
        SELECT t.amount
        FROM transactions t
        JOIN budget_filters bf ON t.household_id = bf.household_id
        LEFT JOIN budget_categories bcat ON bf.category_id = bcat.category_id
        LEFT JOIN budget_accounts bacc ON t.account_id = bacc.account_id
        WHERE 
            t.date BETWEEN bf.start_date AND LEAST(bf.end_date, p_as_of)
            AND t.amount < 0 -- Только расходы
            AND t.transfer_id IS NULL  -- Исключаем переводы
            AND (
                (bcat.category_id IS NOT NULL)  -- Совпадение по категории
                OR 
                (bacc.account_id IS NOT NULL)  -- Совпадение по счету
                OR
                (bcat.category_id IS NOT NULL AND bacc.account_id IS NOT NULL)  -- Совпадение по категории и счету (пересечение)
            )
    )
    SELECT COALESCE(SUM(ABS(amount)), 0)
    INTO spent
    FROM eligible_transactions;
    
    RETURN spent;
END;
$$ LANGUAGE plpgsql;

-- Функция для вычисления полученного дохода по бюджету (только доходы, исключая переводы)
CREATE OR REPLACE FUNCTION calculate_budget_income(p_budget_id UUID, p_as_of DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
    income DECIMAL(15, 2);
BEGIN
    WITH budget_filters AS (
        SELECT 
            b.id,
            b.household_id,
            b.direction,
            b.period,
            b.start_date,
            b.end_date,
            bc.category_id,
            ba.account_id
        FROM budgets b
        LEFT JOIN budget_categories bc ON b.id = bc.budget_id
        LEFT JOIN budget_accounts ba ON b.id = ba.budget_id
        WHERE b.id = p_budget_id
    ),
    eligible_transactions AS (
        SELECT t.amount
        FROM transactions t
        JOIN budget_filters bf ON t.household_id = bf.household_id
        LEFT JOIN budget_categories bcat ON bf.category_id = bcat.category_id
        LEFT JOIN budget_accounts bacc ON t.account_id = bacc.account_id
        WHERE 
            t.date BETWEEN bf.start_date AND LEAST(bf.end_date, p_as_of)
            AND t.amount > 0  -- Только доходы
            AND t.transfer_id IS NULL -- Исключаем переводы
            AND (
                (bcat.category_id IS NOT NULL)  -- Совпадение по категории
                OR 
                (bacc.account_id IS NOT NULL)  -- Совпадение по счету
                OR
                (bcat.category_id IS NOT NULL AND bacc.account_id IS NOT NULL)  -- Совпадение по категории и счету (пересечение)
            )
    )
    SELECT COALESCE(SUM(amount), 0)
    INTO income
    FROM eligible_transactions;
    
    RETURN income;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения доступного остатка по бюджету с учетом переноса
CREATE OR REPLACE FUNCTION calculate_budget_available(p_budget_id UUID, p_as_of DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
    budget_record RECORD;
    spent DECIMAL(15, 2);
    income DECIMAL(15, 2);
    available DECIMAL(15, 2);
BEGIN
    SELECT * INTO budget_record FROM budgets WHERE id = p_budget_id;
    
    IF budget_record.direction = 'expense' THEN
        spent := calculate_budget_spent(p_budget_id, p_as_of);
        available := budget_record.amount - spent;
        
        -- Если бюджет с переносом, добавляем остаток с предыдущих периодов
        IF budget_record.rollover THEN
            -- Здесь может быть логика для учета переноса из предыдущих периодов
            -- Для упрощения в этой версии просто возвращаем текущую доступность
            NULL; -- Заглушка
        END IF;
    ELSIF budget_record.direction = 'income' THEN
        income := calculate_budget_income(p_budget_id, p_as_of);
        available := budget_record.amount - income;
        
        -- Если бюджет с переносом, добавляем остаток с предыдущих периодов
        IF budget_record.rollover THEN
            -- Здесь может быть логика для учета переноса из предыдущих периодов
            -- Для упрощения в этой версии просто возвращаем текущую доступность
            NULL; -- Заглушка
        END IF;
    ELSE
        available := 0;
    END IF;
    
    RETURN available;
END;
$$ LANGUAGE plpgsql;

-- Функция для обновления баланса всех счетов пользователя (для триггеров или фоновых задач)
CREATE OR REPLACE FUNCTION update_all_accounts_balances(p_household_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Это упрощенная версия - в реальном приложении может потребоваться более сложная логика
    -- в зависимости от производительности и частоты обновлений
    NULL; -- Заглушка
END;
$$ LANGUAGE plpgsql;