# API Reference приложения "Семейные финансы"

## Обзор

API приложения "Семейные финансы" построено на основе RESTful принципов и использует Supabase в качестве backend. Для аутентификации используются JWT-токены, получаемые через Supabase Auth.

### Базовый URL

Все API-запросы начинаются с базового URL вашего Supabase проекта:
```
https://<your-project-ref>.supabase.co/rest/v1/
```

### Аутентификация

Для всех запросов, требующих аутентификации, необходимо включить заголовок:
```
Authorization: Bearer <access-token>
```

Токен доступа можно получить через Supabase Auth после успешной аутентификации пользователя.

### Формат данных

- Заголовок: `Content-Type: application/json`
- Ответы: JSON
- Кодировка: UTF-8

## Аутентификация и авторизация

### Supabase Auth

API аутентификации предоставлен Supabase и включает в себя:

#### Регистрация пользователя
```
POST https://<your-project-ref>.supabase.co/auth/v1/signup
```
Заголовки:
- `Content-Type: application/json`
- `apikey: <anon-key>`

Тело запроса:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Вход пользователя
```
POST https://<your-project-ref>.supabase.co/auth/v1/token?grant_type=password
```
Заголовки:
- `Content-Type: application/json`
- `apikey: <anon-key>`

Тело запроса:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Выход пользователя
```
POST https://<your-project-ref>.supabase.co/auth/v1/logout
```
Заголовки:
- `Authorization: Bearer <access-token>`
- `apikey: <anon-key>`

## Счета

### Получение списка счетов
```
GET /accounts
```
Заголовки:
- `Authorization: Bearer <access-token>`
- `apikey: <anon-key>`

Параметры запроса:
- `include_balance` (boolean): включить ли текущий баланс в ответ
- `select` (string): список полей для возврата (по умолчанию: "*")
- `order` (string): сортировка (по умолчанию: "sort_order.nullslast,name.asc")

Пример:
```
GET /accounts?include_balance=true&select=id,name,type,balance
```

Ответ:
```json
[
  {
    "id": "uuid",
    "name": "Основной счет",
    "type": "checking",
    "currency": "EUR",
    "opening_balance": 1000.00,
    "balance": 1500.00,
    "is_archived": false,
    "note": "Основной расчетный счет",
    "sort_order": 1,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  }
]
```

### Создание счета
```
POST /accounts
```
Заголовки:
- `Authorization: Bearer <access-token>`
- `apikey: <anon-key>`
- `Prefer: return=representation`

Тело запроса:
```json
{
  "name": "Новый счет",
  "type": "savings",
  "currency": "EUR",
  "opening_balance": 500.00,
  "note": "Сберегательный счет",
  "sort_order": 2
}
```

Ответ:
```json
{
  "id": "uuid",
  "name": "Новый счет",
  "type": "savings",
  "currency": "EUR",
  "opening_balance": 500.00,
  "balance": 500.00,
  "is_archived": false,
  "note": "Сберегательный счет",
  "sort_order": 2,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z"
}
```

### Обновление счета
```
PATCH /accounts/:id
```
Заголовки:
- `Authorization: Bearer <access-token>`
- `apikey: <anon-key>`
- `Prefer: return=representation`

Тело запроса:
```json
{
  "name": "Обновленное имя счета",
  "note": "Обновленное примечание"
}
```

Ответ:
```json
{
  "id": "uuid",
  "name": "Обновленное имя счета",
  "type": "savings",
  "currency": "EUR",
  "opening_balance": 500.00,
  "balance": 500.00,
  "is_archived": false,
  "note": "Обновленное примечание",
  "sort_order": 2,
  "created_at": "2023-01-01T00:00Z",
  "updated_at": "2023-01-01T00:00:00Z"
}
```

### Изменение порядка счетов
```
PATCH /accounts/reorder
```
Заголовки:
- `Authorization: Bearer <access-token>`
- `apikey: <anon-key>`

Тело запроса:
```json
[
  {
    "id": "uuid1",
    "sort_order": 1
  },
  {
    "id": "uuid2",
    "sort_order": 2
  }
]
```

### Архивация/разархивация счета
```
PATCH /accounts/:id
```
Заголовки:
- `Authorization: Bearer <access-token>`
- `apikey: <anon-key>`
- `Prefer: return=representation`

Тело запроса:
```json
{
  "is_archived": true
}
```

## Транзакции

### Получение списка транзакций
```
GET /transactions
```
Заголовки:
- `Authorization: Bearer <access-token>`
- `apikey: <anon-key>`

Параметры запроса:
- `account_id` (uuid): фильтр по счету
- `category_id` (uuid): фильтр по категории
- `from_date` (string): фильтр по дате (YYYY-MM-DD)
- `to_date` (string): фильтр по дате (YYYY-MM-DD)
- `payee` (string): фильтр по плательщику
- `type` (string): фильтр по типу (income, expense)
- `limit` (integer): ограничение количества результатов
- `offset` (integer): смещение для пагинации
- `order` (string): сортировка (по умолчанию: "date.desc,created_at.desc")

Пример:
```
GET /transactions?account_id=uuid1&from_date=2023-01-01&to_date=2023-01-31&order=date.desc
```

Ответ:
```json
[
  {
    "id": "uuid",
    "date": "2023-01-15T10:30:00Z",
    "account_id": "uuid1",
    "amount": -100.00,
    "category_id": "uuid2",
    "payee": "Магазин продуктов",
    "note": "Покупка продуктов",
    "debt_id": null,
    "transfer_id": null,
    "member_id": "uuid3",
    "created_at": "2023-01-15T10:30:00Z",
    "updated_at": "2023-01-15T10:30:00Z",
    "account": {
      "name": "Основной счет",
      "type": "checking"
    },
    "category": {
      "name": "Продукты",
      "type": "expense"
    }
  }
]
```

### Создание транзакции
```
POST /transactions
```
Заголовки:
- `Authorization: Bearer <access-token>`
- `apikey: <anon-key>`
- `Prefer: return=representation`

Тело запроса:
```json
{
  "date": "2023-01-15T10:30:00Z",
  "account_id": "uuid1",
  "amount": -100.00,
  "category_id": "uuid2",
 "payee": "Магазин продуктов",
  "note": "Покупка продуктов",
  "debt_id": null
}
```

Ответ:
```json
{
  "id": "uuid",
  "date": "2023-01-15T10:30:00Z",
  "account_id": "uuid1",
  "amount": -100.00,
  "category_id": "uuid2",
  "payee": "Магазин продуктов",
  "note": "Покупка продуктов",
  "debt_id": null,
 "transfer_id": null,
  "member_id": "uuid3",
  "created_at": "2023-01-15T10:30:00Z",
  "updated_at": "2023-01-15T10:30:00Z"
}
```

### Создание перевода
```
POST /transfers
```
Заголовки:
- `Authorization: Bearer <access-token>`
- `apikey: <anon-key>`

Тело запроса:
```json
{
  "from_account_id": "uuid1",
  "to_account_id": "uuid2",
  "amount": 500.00,
  "date": "2023-01-20T14:00:0Z",
  "note": "Перевод между счетами"
}
```

Ответ:
```json
{
  "from_transaction": {
    "id": "uuid_from",
    "account_id": "uuid1",
    "amount": -500.00,
    "transfer_id": "transfer_uuid"
  },
  "to_transaction": {
    "id": "uuid_to",
    "account_id": "uuid2",
    "amount": 500.00,
    "transfer_id": "transfer_uuid"
  }
}
```

## Бюджеты

### Получение списка бюджетов
```
GET /budgets
```
Заголовки:
- `Authorization: Bearer <access-token>`
- `apikey: <anon-key>`

Параметры запроса:
- `select` (string): список полей для возврата
- `order` (string): сортировка (по умолчанию: "sort_order.nullslast,name.asc")

Пример:
```
GET /budgets?select=id,name,amount,period_type,start_date,end_date
```

Ответ:
```json
[
  {
    "id": "uuid",
    "name": "Бюджет на продукты",
    "period_type": "monthly",
    "start_date": "2023-01-01",
    "end_date": "2023-01-31",
    "amount": 1000.00,
    "direction": "expense",
    "rollover": true,
    "include_subtree": false,
    "sort_order": 1,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  }
]
```

### Создание бюджета
```
POST /budgets
```
Заголовки:
- `Authorization: Bearer <access-token>`
- `apikey: <anon-key>`
- `Prefer: return=representation`

Тело запроса:
```json
{
  "name": "Новый бюджет",
  "period_type": "monthly",
  "start_date": "2023-02-01",
  "end_date": "2023-02-28",
  "amount": 1500.00,
  "direction": "expense",
  "rollover": false,
  "include_subtree": true,
 "sort_order": 2
}
```

Ответ:
```json
{
  "id": "uuid",
  "name": "Новый бюджет",
  "period_type": "monthly",
  "start_date": "2023-02-01",
  "end_date": "2023-02-28",
  "amount": 1500.00,
  "direction": "expense",
  "rollover": false,
  "include_subtree": true,
  "sort_order": 2,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z"
}
```

### Обновление бюджета
```
PATCH /budgets/:id
```
Заголовки:
- `Authorization: Bearer <access-token>`
- `apikey: <anon-key>`
- `Prefer: return=representation`

Тело запроса:
```json
{
  "name": "Обновленный бюджет",
  "amount": 2000.00
}
```

### Расчет бюджета на дату
```
GET /budgets/:id/compute
```
Заголовки:
- `Authorization: Bearer <access-token>`
- `apikey: <anon-key>`

Параметры запроса:
- `as_of` (string): дата для расчета (YYYY-MM-DD)

Пример:
```
GET /budgets/uuid/compute?as_of=2023-01-15
```

Ответ:
```json
{
  "budget_id": "uuid",
  "as_of": "2023-01-15",
  "spent": 750.00,
  "available": 250.00,
  "limit": 1000.00
}
```

## Категории

### Получение списка категорий
```
GET /categories
```
Заголовки:
- `Authorization: Bearer <access-token>`
- `apikey: <anon-key>`

Параметры запроса:
- `parent_id` (uuid): фильтр по родительской категории (null для корневых)
- `select` (string): список полей для возврата
- `order` (string): сортировка (по умолчанию: "path.asc")

Пример:
```
GET /categories?parent_id=uuid_parent
```

Ответ:
```json
[
  {
    "id": "uuid",
    "parent_id": "uuid_parent",
    "name": "Подкатегория",
    "type": "expense",
    "path": "Расходы:Продукты:Подкатегория",
    "icon": "shopping-cart",
    "color": "#FF0000",
    "created_at": "2023-01-01T00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  }
]
```

### Создание категории
```
POST /categories
```
Заголовки:
- `Authorization: Bearer <access-token>`
- `apikey: <anon-key>`
- `Prefer: return=representation`

Тело запроса:
```json
{
  "name": "Новая категория",
  "parent_id": "uuid_parent",
  "type": "expense",
  "icon": "tag",
  "color": "#0FF00"
}
```

Ответ:
```json
{
  "id": "uuid",
  "parent_id": "uuid_parent",
  "name": "Новая категория",
  "type": "expense",
 "path": "Расходы:Продукты:Новая категория",
  "icon": "tag",
  "color": "#00FF00",
  "created_at": "2023-01-01T00:00Z",
  "updated_at": "2023-01-01T00:00Z"
}
```

## Долги

### Получение списка долгов
```
GET /debts
```
Заголовки:
- `Authorization: Bearer <access-token>`
- `apikey: <anon-key>`

Параметры запроса:
- `select` (string): список полей для возврата
- `order` (string): сортировка (по умолчанию: "name.asc")

Пример:
```
GET /debts?select=id,name,counterparty,opening_balance
```

Ответ:
```json
[
  {
    "id": "uuid",
    "name": "Кредит",
    "counterparty": "Банк",
    "opening_balance": 1000.00,
    "current_balance": 8500.00,
    "interest_rate": 5.5,
    "minimum_payment": 500.00,
    "start_date": "2023-01-01",
    "end_date": "2025-01-01",
    "note": "Потребительский кредит",
    "created_at": "2023-01-01T00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  }
]
```

### Создание долга
```
POST /debts
```
Заголовки:
- `Authorization: Bearer <access-token>`
- `apikey: <anon-key>`
- `Prefer: return=representation`

Тело запроса:
```json
{
  "name": "Новый долг",
  "counterparty": "Друг",
  "opening_balance": 100.00,
  "interest_rate": 0.0,
  "minimum_payment": 0.0,
  "start_date": "2023-01-01",
  "end_date": "2023-12-31",
  "note": "Долг перед другом"
}
```

## Правила автокатегоризации

### Получение списка правил
```
GET /rules
```
Заголовки:
- `Authorization: Bearer <access-token>`
- `apikey: <anon-key>`

Параметры запроса:
- `is_active` (boolean): фильтр по статусу активности
- `type` (string): фильтр по типу правила
- `order` (string): сортировка (по умолчанию: "priority.desc")

Пример:
```
GET /rules?is_active=true&type=payee
```

Ответ:
```json
[
  {
    "id": "uuid",
    "type": "payee",
    "priority": 10,
    "category_id": "uuid_category",
    "pattern": "Магазин продуктов",
    "is_active": true,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
 }
]
```

### Создание правила
```
POST /rules
```
Заголовки:
- `Authorization: Bearer <access-token>`
- `apikey: <anon-key>`
- `Prefer: return=representation`

Тело запроса:
```json
{
  "type": "regex",
  "priority": 5,
  "category_id": "uuid_category",
  "pattern": ".*газ.*",
  "is_active": true
}
```

## Отчеты

### Общий баланс
```
GET /reports/overall-balance
```
Заголовки:
- `Authorization: Bearer <access-token>`
- `apikey: <anon-key>`

Параметры запроса:
- `include_archived` (boolean): включать ли архивные счета (по умолчанию: false)

Пример:
```
GET /reports/overall-balance?include_archived=false
```

Ответ:
```json
{
  "total_balance": 1500.00,
  "by_currency": {
    "EUR": 10000.00,
    "USD": 5000.00
 }
}
```

### Движение за период
```
GET /reports/overall-movement
```
Заголовки:
- `Authorization: Bearer <access-token>`
- `apikey: <anon-key>`

Параметры запроса:
- `from` (string): начальная дата (YYYY-MM-DD)
- `to` (string): конечная дата (YYYY-MM-DD)
- `exclude_transfers` (boolean): исключать ли переводы (по умолчанию: true)

Пример:
```
GET /reports/overall-movement?from=2023-01-01&to=2023-01-31&exclude_transfers=true
```

Ответ:
```json
{
  "income": 5000.00,
  "expense": -3000.00,
  "net": 2000.00,
  "movement": 8000.00
}
```

### Отчет по бюджетам
```
GET /reports/by-budgets
```
Заголовки:
- `Authorization: Bearer <access-token>`
- `apikey: <anon-key>`

Параметры запроса:
- `as_of` (string): дата для расчета (YYYY-MM-DD)

Пример:
```
GET /reports/by-budgets?as_of=2023-01-15
```

Ответ:
```json
{
  "budgets": [
    {
      "budget_id": "uuid",
      "name": "Бюджет на продукты",
      "limit": 1000.00,
      "spent": 750.00,
      "available": 250.00
    }
  ]
}
```

### Отчет по счетам
```
GET /reports/by-accounts
```
Заголовки:
- `Authorization: Bearer <access-token>`
- `apikey: <anon-key>`

Параметры запроса:
- `from` (string): начальная дата (YYYY-MM-DD)
- `to` (string): конечная дата (YYYY-MM-DD)
- `exclude_transfers` (boolean): исключать ли переводы (по умолчанию: true)

Пример:
```
GET /reports/by-accounts?from=2023-01-01&to=2023-01-31&exclude_transfers=true
```

Ответ:
```json
{
  "accounts": [
    {
      "account_id": "uuid",
      "name": "Основной счет",
      "movement": 2000.00,
      "income": 3000.00,
      "expense": -1000.00
    }
  ]
}
```

### Доходы по категориям
```
GET /reports/income-by-category
```
Заголовки:
- `Authorization: Bearer <access-token>`
- `apikey: <anon-key>`

Параметры запроса:
- `from` (string): начальная дата (YYYY-MM-DD)
- `to` (string): конечная дата (YYYY-MM-DD)
- `group_root` (boolean): группировать ли по родительским категориям (по умолчанию: false)

Пример:
```
GET /reports/income-by-category?from=2023-01-01&to=2023-01-31&group_root=true
```

Ответ:
```json
{
  "categories": [
    {
      "category_id": "uuid",
      "name": "Зарплата",
      "amount": 5000.00
    }
  ],
  "total": 5000.00
}
```

### Расходы по категориям
```
GET /reports/expense-by-category
```
Заголовки:
- `Authorization: Bearer <access-token>`
- `apikey: <anon-key>`

Параметры запроса:
- `from` (string): начальная дата (YYYY-MM-DD)
- `to` (string): конечная дата (YYYY-MM-DD)
- `group_root` (boolean): группировать ли по родительским категориям (по умолчанию: false)

Пример:
```
GET /reports/expense-by-category?from=2023-01-01&to=2023-01-31&group_root=true
```

Ответ:
```json
{
  "categories": [
    {
      "category_id": "uuid",
      "name": "Продукты",
      "amount": -1500.00
    }
  ],
  "total": -3000.00
}
```

## Ошибки

### Коды состояния HTTP

- `200 OK` - Запрос успешно обработан
- `201 Created` - Ресурс успешно создан
- `400 Bad Request` - Неверный формат запроса или параметры
- `401 Unauthorized` - Отсутствует или неверный токен аутентификации
- `403 Forbidden` - Недостаточно прав для выполнения операции
- `404 Not Found` - Запрашиваемый ресурс не найден
- `422 Unprocessable Entity` - Ошибка валидации данных
- `500 Internal Server Error` - Внутренняя ошибка сервера

### Формат ошибки

Когда API возвращает ошибку, тело ответа содержит информацию об ошибке:

```json
{
  "error": "Error message",
  "code": "error_code",
  "details": "Additional error details"
}
```

## Ограничения и особенности

- Все даты и время возвращаются в формате ISO 8601
- Валюты представлены в формате ISO 4217 (например, EUR, USD)
- Все суммы представлены в формате DECIMAL(15,2)
- Пагинация по умолчанию ограничена 100 записями
- Запросы к API ограничены по частоте (rate limiting)