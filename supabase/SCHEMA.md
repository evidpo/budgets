# Структура базы данных для приложения семейных финансов

## Обзор

Этот документ описывает структуру базы данных PostgreSQL для веб-приложения семейных финансов, развернутого на Supabase. Схема включает все сущности, определенные в PRD, с поддержкой многопользовательского режима через домохозяйства (households) и Row Level Security (RLS).

## Таблицы

### 1. HOUSEHOLDS (Домохозяйства)
Содержит информацию о домохозяйствах, к которым принадлежат пользователи и финансовые данные.

**Структура:**
- `id` (UUID, PRIMARY KEY) - Уникальный идентификатор домохозяйства
- `name` (VARCHAR(25), NOT NULL) - Название домохозяйства
- `created_at` (TIMESTAMP WITH TIME ZONE) - Дата создания
- `updated_at` (TIMESTAMP WITH TIME ZONE) - Дата последнего обновления
- `version` (INTEGER) - Номер версии для отслеживания изменений

### 2. MEMBERS (Участники домохозяйства)
Связывает пользователей с домохозяйствами и определяет их роли.

**Структура:**
- `id` (UUID, PRIMARY KEY) - Уникальный идентификатор участника
- `household_id` (UUID, FOREIGN KEY) - Ссылка на домохозяйство
- `user_id` (UUID, NOT NULL) - Идентификатор пользователя (из Supabase Auth)
- `role` (VARCHAR(20), DEFAULT 'viewer') - Роль пользователя ('owner', 'editor', 'viewer')
- `created_at` (TIMESTAMP WITH TIME ZONE) - Дата добавления
- `updated_at` (TIMESTAMP WITH TIME ZONE) - Дата последнего обновления
- `version` (INTEGER) - Номер версии для отслеживания изменений

### 3. ACCOUNTS (Счета)
Финансовые счета домохозяйства.

**Структура:**
- `id` (UUID, PRIMARY KEY) - Уникальный идентификатор счета
- `household_id` (UUID, FOREIGN KEY) - Ссылка на домохозяйство
- `name` (VARCHAR(255), NOT NULL) - Название счета
- `type` (VARCHAR(50), NOT NULL) - Тип счета ('cash', 'checking', 'savings', 'credit_card', 'investment', 'card', 'credit', 'other')
- `balance` (DECIMAL(15, 2), DEFAULT 0.0) - Текущий баланс
- `currency` (VARCHAR(3), DEFAULT 'EUR') - Валюта счета
- `opening_balance` (DECIMAL(15, 2), DEFAULT 0.0) - Начальный баланс
- `is_archived` (BOOLEAN, DEFAULT FALSE) - Архивный ли счет
- `note` (TEXT) - Примечание
- `sort_order` (INTEGER) - Порядок сортировки
- `created_at` (TIMESTAMP WITH TIME ZONE) - Дата создания
- `updated_at` (TIMESTAMP WITH TIME ZONE) - Дата последнего обновления
- `version` (INTEGER) - Номер версии для отслеживания изменений

### 4. CATEGORIES (Категории)
Категории доходов и расходов с поддержкой иерархии.

**Структура:**
- `id` (UUID, PRIMARY KEY) - Уникальный идентификатор категории
- `household_id` (UUID, FOREIGN KEY) - Ссылка на домохозяйство
- `parent_id` (UUID) - Ссылка на родительскую категорию (для иерархии)
- `name` (VARCHAR(255), NOT NULL) - Название категории
- `type` (VARCHAR(20), NOT NULL) - Тип категории ('income' или 'expense')
- `path` (VARCHAR(500)) - Путь в иерархии (например, 'Доход:Зарплата:Основная')
- `icon` (VARCHAR(50)) - Иконка категории
- `color` (VARCHAR(7)) - Цвет в формате HEX (#RRGGBB)
- `created_at` (TIMESTAMP WITH TIME ZONE) - Дата создания
- `updated_at` (TIMESTAMP WITH TIME ZONE) - Дата последнего обновления
- `version` (INTEGER) - Номер версии для отслеживания изменений

### 5. TRANSACTIONS (Транзакции)
Финансовые транзакции (доходы, расходы, переводы).

**Структура:**
- `id` (UUID, PRIMARY KEY) - Уникальный идентификатор транзакции
- `household_id` (UUID, FOREIGN KEY) - Ссылка на домохозяйство
- `user_id` (UUID, NOT NULL) - Идентификатор пользователя (для совместимости с существующими миграциями)
- `account_id` (UUID, FOREIGN KEY) - Ссылка на счет
- `category_id` (UUID, FOREIGN KEY) - Ссылка на категорию
- `description` (VARCHAR(500)) - Описание транзакции
- `amount` (DECIMAL(15, 2), NOT NULL) - Сумма (положительная для дохода, отрицательная для расхода)
- `type` (VARCHAR(20)) - Тип транзакции ('income' или 'expense') (для совместимости с существующими миграциями)
- `date` (TIMESTAMP WITH TIME ZONE, DEFAULT NOW()) - Дата транзакции
- `payee` (VARCHAR(255)) - Получатель/отправитель
- `note` (TEXT) - Примечание
- `debt_id` (UUID, FOREIGN KEY) - Ссылка на долг (если транзакция связана с долгом)
- `transfer_id` (UUID, FOREIGN KEY) - Ссылка на перевод (если это часть перевода)
- `member_id` (UUID, FOREIGN KEY) - Ссылка на участника домохозяйства
- `created_at` (TIMESTAMP WITH TIME ZONE) - Дата создания
- `updated_at` (TIMESTAMP WITH TIME ZONE) - Дата последнего обновления
- `version` (INTEGER) - Номер версии для отслеживания изменений

### 6. TRANSFERS (Переводы)
Связывает пару транзакций, представляющих перевод между счетами.

**Структура:**
- `id` (UUID, PRIMARY KEY) - Уникальный идентификатор перевода
- `from_tx_id` (UUID, FOREIGN KEY, UNIQUE) - Ссылка на транзакцию списания
- `to_tx_id` (UUID, FOREIGN KEY, UNIQUE) - Ссылка на транзакцию зачисления
- `created_at` (TIMESTAMP WITH TIME ZONE) - Дата создания
- `updated_at` (TIMESTAMP WITH TIME ZONE) - Дата последнего обновления
- `version` (INTEGER) - Номер версии для отслеживания изменений

### 7. BUDGETS (Бюджеты)
Бюджеты для управления расходами и доходами.

**Структура:**
- `id` (UUID, PRIMARY KEY) - Уникальный идентификатор бюджета
- `household_id` (UUID, FOREIGN KEY) - Ссылка на домохозяйство
- `name` (VARCHAR(255), NOT NULL) - Название бюджета
- `category_id` (UUID, FOREIGN KEY) - Ссылка на категорию (для совместимости с существующими миграциями)
- `amount` (DECIMAL(15, 2), NOT NULL) - Лимит бюджета
- `period` (VARCHAR(20), NOT NULL) - Период ('daily', 'weekly', 'monthly', 'yearly', 'custom')
- `start_date` (DATE, NOT NULL) - Начальная дата
- `end_date` (DATE, NOT NULL) - Конечная дата
- `direction` (VARCHAR(10)) - Направление ('expense' или 'income')
- `rollover` (BOOLEAN, DEFAULT FALSE) - Возможность переноса остатка
- `include_subtree` (BOOLEAN, DEFAULT FALSE) - Включать подкатегории
- `sort_order` (INTEGER) - Порядок сортировки
- `created_at` (TIMESTAMP WITH TIME ZONE) - Дата создания
- `updated_at` (TIMESTAMP WITH TIME ZONE) - Дата последнего обновления
- `version` (INTEGER) - Номер версии для отслеживания изменений

### 8. BUDGET_CATEGORIES (Связь бюджетов и категорий)
Многие-ко-многим связь между бюджетами и категориями.

**Структура:**
- `budget_id` (UUID, FOREIGN KEY, PRIMARY KEY) - Ссылка на бюджет
- `category_id` (UUID, FOREIGN KEY, PRIMARY KEY) - Ссылка на категорию
- `created_at` (TIMESTAMP WITH TIME ZONE) - Дата создания

### 9. BUDGET_ACCOUNTS (Связь бюджетов и счетов)
Многие-ко-многим связь между бюджетами и счетами.

**Структура:**
- `budget_id` (UUID, FOREIGN KEY, PRIMARY KEY) - Ссылка на бюджет
- `account_id` (UUID, FOREIGN KEY, PRIMARY KEY) - Ссылка на счет
- `created_at` (TIMESTAMP WITH TIME ZONE) - Дата создания

### 10. DEBTS (Долги)
Управление долгами и займами.

**Структура:**
- `id` (UUID, PRIMARY KEY) - Уникальный идентификатор долга
- `household_id` (UUID, FOREIGN KEY) - Ссылка на домохозяйство
- `name` (VARCHAR(255), NOT NULL) - Название долга
- `counterparty` (VARCHAR(255)) - Контрагент
- `amount` (DECIMAL(15, 2), NOT NULL) - Сумма долга
- `opening_balance` (DECIMAL(15, 2), DEFAULT 0.0) - Начальный баланс
- `interest_rate` (DECIMAL(5, 2), DEFAULT 0.0) - Процентная ставка
- `minimum_payment` (DECIMAL(15, 2), DEFAULT 0.0) - Минимальный платеж
- `start_date` (DATE) - Дата начала
- `end_date` (DATE) - Дата окончания
- `note` (TEXT) - Примечание
- `created_at` (TIMESTAMP WITH TIME ZONE) - Дата создания
- `updated_at` (TIMESTAMP WITH TIME ZONE) - Дата последнего обновления
- `version` (INTEGER) - Номер версии для отслеживания изменений

### 11. RULES (Правила автокатегоризации)
Правила для автоматической категоризации транзакций.

**Структура:**
- `id` (UUID, PRIMARY KEY) - Уникальный идентификатор правила
- `household_id` (UUID, FOREIGN KEY) - Ссылка на домохозяйство
- `type` (VARCHAR(20), NOT NULL) - Тип правила ('payee', 'regex', 'amount_pattern')
- `priority` (INTEGER, NOT NULL) - Приоритет (выше = важнее)
- `category_id` (UUID, FOREIGN KEY) - Ссылка на категорию, к которой применяется правило
- `pattern` (TEXT) - Паттерн для поиска
- `is_active` (BOOLEAN, DEFAULT TRUE) - Активно ли правило
- `created_at` (TIMESTAMP WITH TIME ZONE) - Дата создания
- `updated_at` (TIMESTAMP WITH TIME ZONE) - Дата последнего обновления
- `version` (INTEGER) - Номер версии для отслеживания изменений

## Индексы

Для обеспечения производительности созданы следующие индексы:

- `idx_accounts_household_id` - Для быстрого поиска счетов по домохозяйству
- `idx_accounts_household_sort_order` - Для сортировки счетов в домохозяйстве
- `idx_categories_household_id` - Для быстрого поиска категорий по домохозяйству
- `idx_categories_household_path` - Для иерархического поиска категорий
- `idx_categories_parent_id` - Для построения иерархии категорий
- `idx_transactions_household_date_desc` - Для сортировки транзакций по дате
- `idx_transactions_account_id` - Для поиска транзакций по счету
- `idx_transactions_category_id` - Для поиска транзакций по категории
- `idx_transactions_debt_id` - Для поиска транзакций по долгу
- `idx_transactions_transfer_id` - Для поиска транзакций по переводу
- `idx_transactions_member_id` - Для поиска транзакций по участнику
- `idx_budgets_household_id` - Для поиска бюджетов по домохозяйству
- `idx_budgets_household_sort_order` - Для сортировки бюджетов в домохозяйстве
- `idx_budgets_period` - Для поиска бюджетов по периоду
- `idx_debts_household_id` - Для поиска долгов по домохозяйству
- `idx_members_household_user` - Для поиска участников по домохозяйству и пользователю
- `idx_members_role` - Для поиска участников по роли
- `idx_rules_household_type_active` - Для поиска активных правил по домохозяйству и типу
- `idx_rules_priority` - Для сортировки правил по приоритету

## Безопасность (RLS)

Для всех таблиц включена Row Level Security (RLS) с политиками, ограничивающими доступ только к данным, принадлежащим домохозяйству пользователя:

- Пользователи могут просматривать только данные из домохозяйств, в которых они являются участниками
- Пользователи могут создавать данные только в своих домохозяйствах
- Права на обновление и удаление зависят от роли пользователя в домохозяйстве
- Владельцы домохозяйства имеют полный доступ ко всем данным домохозяйства
- Редакторы могут просматривать, создавать и обновлять данные
- Просматривающие могут только просматривать данные

## Функции

Созданы следующие функции для вычисления значений:

- `calculate_account_balance(account_id)` - Вычисляет текущий баланс счета
- `calculate_debt_balance(debt_id)` - Вычисляет текущий остаток по долгу
- `calculate_budget_spent(budget_id, date)` - Вычисляет потраченную сумму по бюджету
- `calculate_budget_income(budget_id, date)` - Вычисляет полученный доход по бюджету
- `calculate_budget_available(budget_id, date)` - Вычисляет доступный остаток по бюджету

## Триггеры

Для всех таблиц с полями `updated_at` созданы триггеры, автоматически обновляющие:

- `updated_at` - дату последнего обновления
- `version` - номер версии записи (для отслеживания конфликтов синхронизации)

## Ограничения целостности

- Проверка типа счета (cash, checking, savings, etc.)
- Проверка типа категории (income, expense)
- Проверка типа транзакции (income, expense)
- Проверка ненулевой суммы транзакции
- Проверка типа периода бюджета
- Проверка направления бюджета
- Проверка неотрицательного лимита бюджета
- Проверка роли участника домохозяйства
- Проверка типа правила автокатегоризации
- Проверка диапазона процентной ставки по долгам
- Проверка формата валюты (3 символа)
- Проверка формата цвета (HEX #RRGGBB)
- Проверка даты транзакции (не в далеком будущем)