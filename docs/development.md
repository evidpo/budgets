# Руководство для разработчиков приложения "Семейные финансы"

## Обзор

Этот документ предназначен для разработчиков, которые будут работать с кодовой базой приложения "Семейные финансы". Он описывает архитектуру, структуру проекта, технологии, используемые практики и инструкции по настройке среды разработки.

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

## Технологии

### Frontend
- **Next.js 14+** - React фреймворк с серверным рендерингом
- **TypeScript** - статическая типизация
- **Tailwind CSS** - CSS-фреймворк
- **React Query** - управление состоянием и кэширование
- **Supabase JS** - клиентская библиотека для взаимодействия с Supabase
- **Zod** - валидация данных

### Backend
- **Supabase** - backend-as-a-service (PostgreSQL + Auth + Realtime + Functions)
- **PostgreSQL 14+** - реляционная база данных
- **PostgREST** - автоматический REST API для PostgreSQL
- **Edge Functions** - serverless функции

## Настройка среды разработки

### Требования

- Node.js 18+ 
- npm или yarn
- Supabase CLI
- Docker (для локального запуска Supabase)

### Установка и запуск

#### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd budgets
```

#### 2. Установка зависимостей для frontend

```bash
cd frontend
npm install
```

#### 3. Установка Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Linux/Windows (через Homebrew)
brew install supabase/tap/supabase

# Или загрузите бинарный файл с GitHub Releases
```

#### 4. Запуск локального Supabase

```bash
cd supabase
supabase start
```

#### 5. Настройка переменных окружения для frontend

Создайте файл `.env.local` в директории `frontend/`:

```env
# Supabase конфигурация (локальный инстанс)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.TxHc7r_0JA6J6nG_rZA5THqKZJi4RU64rqU5M2SSN1A

# Дополнительные настройки
NEXT_PUBLIC_APP_NAME=Семейные финансы (Dev)
NEXT_PUBLIC_DEFAULT_CURRENCY=EUR
```

#### 6. Запуск frontend в режиме разработки

```bash
cd frontend
npm run dev
```

Приложение будет доступно по адресу http://localhost:3000

## Архитектура frontend

### Структура компонентов

```
components/
├── accounts/          # Компоненты для работы со счетами
│   ├── AccountCard.tsx
│   ├── AccountForm.tsx
│   └── AccountList.tsx
├── transactions/      # Компоненты для работы с транзакциями
│   ├── TransactionItem.tsx
│   ├── TransactionForm.tsx
│   └── TransactionList.tsx
├── budgets/          # Компоненты для работы с бюджетами
│   ├── BudgetItem.tsx
│   ├── BudgetForm.tsx
│   └── BudgetList.tsx
├── categories/       # Компоненты для работы с категориями
├── debts/           # Компоненты для работы с долгами
├── reports/         # Компоненты для работы с отчетами
├── rules/           # Компоненты для работы с правилами
└── ui/              # Универсальные UI компоненты
    ├── Button.tsx
    ├── Input.tsx
    ├── Modal.tsx
    └── Table.tsx
```

### Страницы приложения

```
pages/
├── _app.tsx          # Основной компонент приложения
├── index.tsx         # Главная страница
├── accounts.tsx      # Страница управления счетами
├── transactions.tsx # Страница управления транзакциями
├── budgets.tsx       # Страница управления бюджетами
├── categories.tsx    # Страница управления категориями
├── debts.tsx         # Страница управления долгами
├── reports.tsx       # Страница отчетов
├── rules.tsx         # Страница правил автокатегоризации
├── import.tsx        # Страница импорта данных
└── accounts/         # Дочерние страницы
    └── [id].tsx      # Детали конкретного счета
```

### Вспомогательные модули

#### lib/supabase.ts
Конфигурация подключения к Supabase:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

#### lib/types.ts
Общие TypeScript типы:

```typescript
export type Account = {
  id: string
  name: string
  type: 'cash' | 'checking' | 'savings' | 'credit_card' | 'investment' | 'card' | 'credit' | 'other'
  balance: number
  currency: string
 opening_balance: number
  is_archived: boolean
 note?: string
 sort_order: number
  created_at: string
  updated_at: string
  version: number
}

export type Transaction = {
  id: string
  date: string
  account_id: string
  amount: number
  category_id?: string
  payee?: string
  note?: string
  debt_id?: string
  transfer_id?: string
  member_id: string
 created_at: string
  updated_at: string
  version: number
}
```

#### lib/api.ts
Обертки для API вызовов:

```typescript
import { supabase } from './supabase'
import { Account, Transaction } from './types'

export const accountsAPI = {
 getAll: async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('sort_order', { nullsFirst: false })
      .order('name')
    
    if (error) throw error
    return data as Account[]
  },
  
  create: async (account: Omit<Account, 'id' | 'created_at' | 'updated_at' | 'version'>) => {
    const { data, error } = await supabase
      .from('accounts')
      .insert([account])
      .select()
      .single()
    
    if (error) throw error
    return data as Account
  },
  
  update: async (id: string, updates: Partial<Account>) => {
    const { data, error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as Account
  }
}
```

### Кастомные хуки

#### hooks/useAccounts.ts
Хук для управления счетами:

```typescript
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { accountsAPI } from '../lib/api'
import { Account } from '../lib/types'

export const useAccounts = () => {
 return useQuery<Account[], Error>('accounts', accountsAPI.getAll)
}

export const useCreateAccount = () => {
  const queryClient = useQueryClient()
  
  return useMutation(accountsAPI.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('accounts')
    }
  })
}

export const useUpdateAccount = () => {
  const queryClient = useQueryClient()
  
  return useMutation(
    ({ id, updates }: { id: string; updates: Partial<Account> }) => 
      accountsAPI.update(id, updates),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('accounts')
      }
    }
 )
}
```

#### hooks/useRealtimeAccounts.ts
Хук для подписки на изменения счетов в реальном времени:

```typescript
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useQueryClient } from 'react-query'

export const useRealtimeAccounts = () => {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('accounts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accounts',
        },
        (payload) => {
          queryClient.invalidateQueries('accounts')
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}
```

## Архитектура backend (Supabase)

### Структура базы данных

См. документацию в [database-schema.md](database-schema.md) для полного описания структуры базы данных.

### Миграции

Миграции находятся в `supabase/migrations/` и применяются в хронологическом порядке:

```sql
-- 001_create_accounts_table.sql
CREATE TABLE accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES households(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  balance DECIMAL(15,2) DEFAULT 0.0,
  currency VARCHAR(3) DEFAULT 'EUR',
  opening_balance DECIMAL(15,2) DEFAULT 0.0,
  is_archived BOOLEAN DEFAULT FALSE,
  note TEXT,
  sort_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

-- Включаем RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Создаем политику
CREATE POLICY "Users can access their household accounts" ON accounts
FOR ALL USING (
  household_id IN (
    SELECT id FROM households h
    JOIN members m ON h.id = m.household_id
    WHERE m.user_id = auth.uid()
  )
);
```

### Функции

Пользовательские функции для вычислений:

```sql
-- Вычисление баланса счета
CREATE OR REPLACE FUNCTION calculate_account_balance(p_account_id UUID)
RETURNS DECIMAL(15,2)
LANGUAGE plpgsql
AS $$
DECLARE
  balance DECIMAL(15,2);
BEGIN
  SELECT COALESCE(SUM(amount), 0) + opening_balance
  INTO balance
 FROM transactions
  WHERE account_id = p_account_id
  AND transfer_id IS NULL; -- Исключаем переводы для корректного расчета

  RETURN balance;
END;
$$;
```

### Edge Functions

Функции для сложной бизнес-логики находятся в `supabase/functions/`:

```typescript
// supabase/functions/import-transactions/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { csvData, householdId } = await req.json()
    
    // Логика импорта CSV
    const transactions = parseCSV(csvData)
    const validatedTransactions = validateTransactions(transactions)
    
    const { data, error } = await supabase
      .from('transactions')
      .insert(validatedTransactions.map(t => ({
        ...t,
        household_id: householdId
      })))
    
    if (error) throw error
    
    return new Response(
      JSON.stringify({ success: true, imported: data.length }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})

function parseCSV(csvData: string) {
  // Реализация парсинга CSV
  return []
}

function validateTransactions(transactions: any[]) {
  // Реализация валидации транзакций
  return transactions
}
```

## Валидация данных

### Zod схемы

Валидация данных с использованием Zod находится в `frontend/lib/validation/`:

```typescript
// frontend/lib/validation/zodSchemas.ts
import { z } from 'zod'

export const accountSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(255),
  type: z.enum(['cash', 'checking', 'savings', 'credit_card', 'investment', 'card', 'credit', 'other']),
  currency: z.string().length(3).default('EUR'),
  opening_balance: z.number().default(0),
  is_archived: z.boolean().default(false),
  note: z.string().optional(),
  sort_order: z.number().optional(),
})

export const transactionSchema = z.object({
  date: z.string().datetime(),
  account_id: z.string().uuid(),
  amount: z.number().nonzero('Сумма должна быть ненулевой'),
  category_id: z.string().uuid().optional(),
  payee: z.string().max(255).optional(),
  note: z.string().optional(),
  debt_id: z.string().uuid().optional(),
  transfer_id: z.string().uuid().optional(),
  member_id: z.string().uuid(),
})
```

### Валидация на backend

Дополнительная валидация на уровне базы данных с использованием CHECK ограничений:

```sql
-- Проверка типа счета
ALTER TABLE accounts ADD CONSTRAINT valid_account_type 
CHECK (type IN ('cash', 'checking', 'savings', 'credit_card', 'investment', 'card', 'credit', 'other'));

-- Проверка формата валюты
ALTER TABLE accounts ADD CONSTRAINT valid_currency_format 
CHECK (char_length(currency) = 3);

-- Проверка формата цвета
ALTER TABLE categories ADD CONSTRAINT valid_color_format 
CHECK (color ~ '^#[0-9A-F]{6}$');
```

## Тестирование

### Unit тесты

Unit тесты для frontend находятся в `frontend/__tests__/`:

```typescript
// frontend/__tests__/utils/calculateBalance.test.ts
import { calculateAccountBalance } from '../../lib/utils'

describe('calculateAccountBalance', () => {
  test('should calculate balance correctly', () => {
    const transactions = [
      { amount: 100 },
      { amount: -50 },
      { amount: 25 }
    ]
    
    const balance = calculateAccountBalance(transactions as any, 0)
    expect(balance).toBe(75)
  })
})
```

### Интеграционные тесты

Интеграционные тесты для API находятся в `tests/`:

```typescript
// tests/functional.test.ts
import { test, expect } from '@playwright/test'

test.describe('Accounts functionality', () => {
  test('should create a new account', async ({ page }) => {
    await page.goto('/accounts')
    await page.click('button:has-text("Добавить счет")')
    
    await page.fill('input[name="name"]', 'Новый счет')
    await page.click('button:has-text("Сохранить")')
    
    await expect(page.locator('text=Новый счет')).toBeVisible()
  })
})
```

## Линтеры и форматирование

### ESLint

Конфигурация ESLint в `frontend/.eslintrc.json`:

```json
{
  "extends": ["next/core-web-vitals", "@typescript-eslint/recommended"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "no-console": "warn",
    "prefer-const": "error"
  }
}
```

### Prettier

Конфигурация Prettier в `frontend/.prettierrc`:

```json
{
  "semi": false,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

## Работа с Git

### Ветвление

- `main` - основная ветка для production
- `develop` - ветка для интеграции функций
- `feature/...` - ветки для разработки новых функций
- `bugfix/...` - ветки для исправления багов
- `hotfix/...` - ветки для срочных исправлений в production

### Commit сообщения

Следуйте стандарту conventional commits:

```
feat: добавление новой функции управления бюджетами
fix: исправление ошибки в вычислении баланса счета
docs: обновление документации по API
style: форматирование кода в компоненте AccountCard
refactor: рефакторинг логики валидации транзакций
test: добавление тестов для импорта CSV
chore: обновление зависимостей
```

## Деплоймент

### Локальный деплой

Для локального тестирования production сборки:

```bash
# Сборка frontend
cd frontend
npm run build

# Запуск в production режиме
npm start
```

### CI/CD

Конфигурация GitHub Actions в `.github/workflows/`:

```yaml
# .github/workflows/test.yml
name: Run Tests
on: [push, pull_request]

jobs:
 test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd frontend && npm ci
      - run: cd frontend && npm test
      - run: cd frontend && npm run build
```

## Отладка

### Frontend отладка

- Используйте browser dev tools для отладки
- Включите React Developer Tools
- Используйте React Query Devtools для отладки запросов:

```typescript
// frontend/pages/_app.tsx
import { ReactQueryDevtools } from 'react-query/devtools'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

### Backend отладка

- Используйте Supabase Dashboard для мониторинга запросов
- Включите логирование в PostgreSQL
- Используйте `RAISE NOTICE` для отладки PL/pgSQL функций

## Производительность

### Frontend оптимизации

- Используйте виртуализацию списков для больших коллекций
- Оптимизируйте запросы с помощью React Query кэширования
- Используйте `React.memo` для предотвращения ненужных ререндеров
- Оптимизируйте изображения и статические ресурсы

### Backend оптимизации

- Создавайте индексы для часто используемых полей:
  ```sql
  CREATE INDEX idx_transactions_household_date_desc 
  ON transactions(household_id, date DESC);
  
  CREATE INDEX idx_accounts_household_sort_order 
  ON accounts(household_id, sort_order NULLS LAST, name);
  ```
- Используйте курсорную пагинацию для списков
- Оптимизируйте сложные запросы с помощью материализованных представлений

## Безопасность в разработке

### Проверки безопасности

- Проверяйте все пользовательские вводы
- Используйте параметризованные запросы
- Проверяйте права доступа на каждом уровне
- Регулярно обновляйте зависимости

### Проверка уязвимостей

```bash
# Проверка уязвимостей в зависимостях
npm audit

# Использование Snyk или Dependabot для автоматических проверок
```

## Соглашения по коду

### Именование

- Файлы: `kebab-case.tsx` для компонентов, `camelCase.ts` для утилит
- Компоненты: `PascalCase`
- Переменные и функции: `camelCase`
- Константы: `UPPER_SNAKE_CASE`

### Структура файлов

- Один компонент/функция на файл (когда это возможно)
- Четкое разделение логики и представления
- Последовательная структура импортов

### Документирование

- Используйте JSDoc для публичных функций
- Комментируйте сложную логику
- Поддерживайте актуальность документации

## Заключение

Следование этим рекомендациям поможет обеспечить согласованность, безопасность и поддерживаемость кодовой базы приложения "Семейные финансы". При возникновении вопросов обращайтесь к архитектурной документации или к команде разработчиков.