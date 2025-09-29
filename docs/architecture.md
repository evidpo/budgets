# Архитектурное решение проекта "Семейные финансы"

## Обзор архитектуры

Проект "Семейные финансы" реализован по модульной архитектуре с разделением на frontend и backend слои. В качестве backend используется Supabase, предоставляющий PostgreSQL базу данных, аутентификацию и Edge функции. Frontend реализован как Next.js приложение с использованием TypeScript.

## Структура проекта

```
budgets/
├── frontend/              # Next.js приложение
│   ├── pages/             # Страницы приложения (роутинг)
│   ├── components/        # React компоненты
│   ├── lib/               # Вспомогательные функции и типы
│   ├── hooks/             # Кастомные React хуки
│   ├── styles/            # Стили
│   └── public/            # Статические файлы
├── supabase/              # Конфигурация и миграции Supabase
│   ├── config.toml        # Конфигурация
│   ├── migrations/        # SQL миграции
│   ├── functions/         # Edge функции
│   └── seed.sql           # Демо данные
└── docs/                  # Документация
```

## Frontend архитектура

### Технологии
- Next.js 14+ (React фреймворк)
- TypeScript
- Tailwind CSS (или другая CSS-библиотека)
- React Query (или SWR) для управления состоянием
- Supabase JS клиент для взаимодействия с backend

### Структура компонентов
- `components/accounts/` - компоненты для работы со счетами
- `components/transactions/` - компоненты для работы с транзакциями
- `components/budgets/` - компоненты для работы с бюджетами
- `components/categories/` - компоненты для работы с категориями
- `components/debts/` - компоненты для работы с долгами
- `components/reports/` - компоненты для работы с отчетами

### Страницы приложения
- `/` - главная страница
- `/accounts` - управление счетами
- `/transactions` - управление транзакциями
- `/budgets` - управление бюджетами
- `/categories` - управление категориями
- `/debts` - управление долгами
- `/rules` - правила автокатегоризации
- `/reports` - отчеты
- `/import` - импорт данных

### Вспомогательные модули
- `lib/supabase.ts` - конфигурация подключения к Supabase
- `lib/types.ts` - общие TypeScript типы
- `lib/utils.ts` - вспомогательные функции
- `hooks/useAccounts.ts` - кастомный хук для работы со счетами

## Backend архитектура (Supabase)

### База данных (PostgreSQL)

#### Схема данных

**USERS**
- `id` - идентификатор пользователя
- `email` - email пользователя
- `created_at` - дата создания
- Другие поля аутентификации

**HOUSEHOLDS**
- `id` - идентификатор household
- `name` - название household
- `created_at` - дата создания

**MEMBERS**
- `id` - идентификатор участника
- `household_id` - ссылка на household
- `user_id` - ссылка на пользователя
- `role` - роль ('owner'|'editor'|'viewer')
- `created_at` - дата создания
- Уникальность: `(household_id, user_id)`

**ACCOUNTS**
- `id` - идентификатор счета
- `household_id` - ссылка на household
- `name` - название счета
- `type` - тип ('cash'|'card'|'savings'|'credit'|'other')
- `currency` - валюта (по умолчанию 'EUR')
- `opening_balance` - начальный баланс
- `is_archived` - флаг архивации
- `note` - заметка
- `sort_order` - порядок сортировки
- `created_at`, `updated_at`, `version` - системные поля

**CATEGORIES**
- `id` - идентификатор категории
- `household_id` - ссылка на household
- `parent_id` - ссылка на родительскую категорию (для иерархии)
- `name` - название категории
- `path` - путь в иерархии (например, 'Root:Child:Sub')
- `icon` - иконка
- `color` - цвет (#RRGGBB)
- `updated_at`, `version` - системные поля

**DEBTS**
- `id` - идентификатор долга
- `household_id` - ссылка на household
- `name` - название долга
- `counterparty` - контрагент
- `opening_balance` - начальный баланс
- `note` - заметка
- `updated_at`, `version` - системные поля

**TRANSACTIONS**
- `id` - идентификатор транзакции
- `household_id` - ссылка на household
- `date` - дата транзакции
- `account_id` - ссылка на счет
- `amount` - сумма (±)
- `category_id` - ссылка на категорию (опционально)
- `payee` - плательщик
- `note` - заметка
- `debt_id` - ссылка на долг (опционально)
- `transfer_id` - ссылка на перевод (опционально)
- `member_id` - ссылка на участника
- `created_at`, `updated_at`, `version` - системные поля

**TRANSFERS**
- `id` - идентификатор перевода
- `from_tx_id` - ссылка на исходящую транзакцию (уникальная)
- `to_tx_id` - ссылка на входящую транзакцию (уникальная)

**BUDGETS**
- `id` - идентификатор бюджета
- `household_id` - ссылка на household
- `name` - название бюджета
- `period_type` - тип периода (week|month|quarter|year|custom)
- `start_date` - дата начала
- `end_date` - дата окончания (опционально)
- `amount` - сумма бюджета
- `direction` - направление (expense|income)
- `rollover` - флаг переноса остатка
- `include_subtree` - флаг включения поддерева категорий
- `sort_order` - порядок сортировки
- `updated_at`, `version` - системные поля

**BUDGET_CATEGORIES**
- `budget_id` - ссылка на бюджет
- `category_id` - ссылка на категорию
- Составной первичный ключ: `(budget_id, category_id)`

**BUDGET_ACCOUNTS**
- `budget_id` - ссылка на бюджет
- `account_id` - ссылка на счет
- Составной первичный ключ: `(budget_id, account_id)`

**RULES**
- `id` - идентификатор правила
- `household_id` - ссылка на household
- `type` - тип правила ('payee'|'regex'|'amount_pattern')
- `priority` - приоритет
- `category_id` - ссылка на категорию
- `pattern` - паттерн
- `is_active` - флаг активности
- `created_at` - дата создания

### Индексы
- `transactions(household_id,date DESC)`
- `transactions(account_id)`
- `transactions(category_id)`
- `transactions(debt_id)`
- `transactions(transfer_id)`
- `transactions(member_id)`
- `accounts(household_id, sort_order NULLS LAST, name)`
- `budgets(household_id, sort_order NULLS LAST, name)`
- `categories(household_id, path)`
- `rules(household_id,type,is_active)`

### Безопасность
- RLS (Row Level Security) для ограничения доступа к данным
- Доступ только к строкам с `household_id` участника
- JWT токены для аутентификации

### Реалтайм
- Supabase Realtime для подписки на изменения
- Подписки на `transactions`, `accounts`, `budgets`, `debts`, `categories` с фильтром по `household_id`

## API архитектура

### Аутентификация
- Использование Supabase Auth
- JWT токены для авторизации запросов

### Основные эндпоинты

**Auth/Members/Invites**
- Использование встроенных эндпоинтов Supabase
- `POST /invites` - создание приглашения
- `POST /invites/accept` - принятие приглашения

**Accounts**
- `GET /accounts?include_balance=1` - получение списка счетов
- `PATCH /accounts/reorder` - изменение порядка счетов
- `PATCH /accounts/:id` - обновление счета

**Transactions**
- `GET /transactions` - получение транзакций с фильтрами
- `POST /transactions` - создание транзакции
- `POST /transfers` - создание перевода

**Budgets**
- `GET/POST/PATCH /budgets` - операции с бюджетами
- `GET /budgets/:id/compute?as_of=` - расчет бюджета на дату

**Reports**
- `GET /reports/overall-balance?include_archived=false` - общий баланс
- `GET /reports/overall-movement?from=&to=&exclude_transfers=true` - движение за период
- `GET /reports/by-budgets?as_of=` - по бюджетам
- `GET /reports/by-accounts?from=&to=&exclude_transfers=true` - по счетам
- `GET /reports/income-by-category?from=&to=&group_root=false` - доходы по категориям
- `GET /reports/expense-by-category?from=&to=&group_root=false` - расходы по категориям

## Интеграции

### Frontend ↔ Backend
- REST API поверх Supabase
- Прямые вызовы Supabase клиентов из frontend
- Realtime подписки через Supabase

### Технические интеграции
- Next.js API Routes для кастомных эндпоинтов
- Supabase Edge Functions для сложной бизнес-логики
- PostgreSQL для хранения данных
- Supabase Auth для аутентификации

## Паттерны и практики

### Frontend паттерны
- Компонентный подход с React
- Кастомные хуки для логики
- Управление состоянием через React Query
- Типобезопасность через TypeScript

### Backend паттерны
- Row Level Security для изоляции данных
- Индексация для производительности
- Версионирование данных
- Идемпотентные операции

### Архитектурные решения
- Разделение ответственности между frontend и backend
- Использование готовых решений (Supabase) для стандартных функций
- Поддержка реалтайм синхронизации
- Поддержка совместной работы в "семье"