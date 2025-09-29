# Инструкция по развертыванию приложения "Семейные финансы"

## Обзор

Этот документ описывает процесс развертывания приложения "Семейные финансы" в production среде. Приложение состоит из двух основных компонентов: frontend (Next.js) и backend (Supabase).

## Требования к инфраструктуре

### Backend (Supabase)
- Доступ к облачному или self-hosted Supabase проекту
- PostgreSQL 14+
- Поддержка Row Level Security (RLS)
- Поддержка Realtime функций
- Доступ к Supabase Auth

### Frontend
- Веб-сервер для раздачи статических файлов (Nginx, Apache, Vercel, Netlify и т.д.)
- Поддержка HTTPS
- Современные браузеры (Chrome 70+, Firefox 65+, Safari 12+, Edge 79+)

## Подготовка к развертыванию

### 1. Настройка Supabase проекта

#### Создание проекта
1. Зарегистрируйтесь на [supabase.com](https://supabase.com) или подготовьте self-hosted инстанс
2. Создайте новый проект
3. Запишите Project URL и Project API keys (анонимный и сервисный ключи)

#### Настройка базы данных
1. Примените миграции из директории `supabase/migrations/`:
   - Выполните SQL-скрипты в хронологическом порядке
   - Или используйте Supabase CLI: `supabase db push`
2. Убедитесь, что RLS политики включены для всех таблиц:
   ```sql
   ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
   ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
   ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
   -- и так для всех таблиц
   ```
3. Установите RLS политики для доступа по household:
   ```sql
   CREATE POLICY "Users can access their household data" ON accounts
   FOR ALL USING (
     household_id IN (
       SELECT id FROM households h
       JOIN members m ON h.id = m.household_id
       WHERE m.user_id = auth.uid()
     )
   );
   ```

#### Настройка Edge Functions (опционально)
Если используются кастомные функции:
1. Разверните Edge Functions из директории `supabase/functions/`
2. Убедитесь, что функции имеют необходимые разрешения

### 2. Подготовка конфигурации

#### Frontend переменные окружения
Создайте файл `.env.production` следующими переменными:

```env
# Supabase конфигурация
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Дополнительные настройки
NEXT_PUBLIC_APP_NAME=Семейные финансы
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_DEFAULT_CURRENCY=EUR

# Настройки безопасности
NEXT_PUBLIC_REQUIRE_HTTPS=true
NEXT_PUBLIC_RATE_LIMIT_WINDOW_MS=60000
NEXT_PUBLIC_RATE_LIMIT_MAX=100
```

#### Настройка домена (опционально)
- Настройте кастомный домен для Supabase проекта (если требуется)
- Обновите Redirect URLs в настройках Auth для OAuth провайдеров

## Развертывание frontend части

### 1. Сборка приложения

В директории `frontend/` выполните:

```bash
# Установка зависимостей
npm install

# Сборка приложения
npm run build
```

### 2. Развертывание на Vercel (рекомендуется)

1. Установите Vercel CLI:
```bash
npm i -g vercel
```

2. Войдите в аккаунт:
```bash
vercel login
```

3. Разверните приложение:
```bash
vercel --prod
```

4. Настройте переменные окружения в интерфейсе Vercel или через CLI:
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```

### 3. Альтернативное развертывание

#### На собственном сервере с Nginx

1. Скопируйте собранные файлы из директории `frontend/out/` на сервер
2. Настройте Nginx конфигурацию:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;

    root /path/to/frontend/out;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Заголовки безопасности
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com;" always;
}
```

#### На Netlify

1. Залейте содержимое директории `frontend/out/` в Netlify
2. Или настройте автоматическую сборку из репозитория
3. Установите переменные окружения в настройках сайта

## Развертывание backend части

### 1. Настройка Supabase (облачный вариант)

#### Конфигурация Auth
1. Войдите в Supabase Dashboard
2. Перейдите в раздел Authentication
3. Настройте провайдеров OAuth (если требуется)
4. Установите Redirect URLs:
   - Для development: `http://localhost:3000`
   - Для production: `https://your-domain.com`

#### Настройка Database
1. Убедитесь, что все миграции применены
2. Проверьте, что RLS политики включены и корректны
3. Настройте Row Level Security политики:

```sql
-- Политики для таблицы accounts
CREATE POLICY "Enable insert for users based on user_id" ON accounts
FOR INSERT WITH CHECK (
  household_id IN (
    SELECT id FROM households h
    JOIN members m ON h.id = m.household_id
    WHERE m.user_id = auth.uid()
  )
);

CREATE POLICY "Enable read access for users based on user_id" ON accounts
FOR SELECT USING (
  household_id IN (
    SELECT id FROM households h
    JOIN members m ON h.id = m.household_id
    WHERE m.user_id = auth.uid()
  )
);

CREATE POLICY "Enable update for users based on user_id" ON accounts
FOR UPDATE USING (
  household_id IN (
    SELECT id FROM households h
    JOIN members m ON h.id = m.household_id
    WHERE m.user_id = auth.uid()
  )
);

CREATE POLICY "Enable delete for users based on user_id" ON accounts
FOR DELETE USING (
  household_id IN (
    SELECT id FROM households h
    JOIN members m ON h.id = m.household_id
    WHERE m.user_id = auth.uid()
  )
);
```

Аналогичные политики должны быть установлены для всех таблиц (transactions, budgets, categories, debts, rules и т.д.).

#### Настройка Realtime
1. Убедитесь, что Realtime включен в настройках проекта
2. Проверьте, что подписки работают корректно

### 2. Self-hosted Supabase

#### Установка через Docker

1. Создайте `docker-compose.yml`:

```yaml
version: "3.8"
services:
  supabase-db:
    image: supabase/postgres:14.1.0
    environment:
      POSTGRES_DB: postgres
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - ./volumes/db/data:/var/lib/postgresql/data

 supabase-auth:
    image: supabase/gotrue:v2.25.0
    depends_on:
      - supabase-db
    environment:
      GOTRUE_JWT_SECRET: your-jwt-secret
      GOTRUE_DB_DRIVER: postgres
      DATABASE_URL: postgres://postgres:postgres@supabase-db:5432/postgres
      GOTRUE_API_HOST: 0.0.0.0
      GOTRUE_API_PORT: 9999

  supabase-rest:
    image: postgrest/postgrest:v9.0.1
    depends_on:
      - supabase-db
    environment:
      PGRST_DB_URI: postgres://postgres:postgres@supabase-db:5432/postgres
      PGRST_DB_SCHEMA: public
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: your-jwt-secret

  supabase-storage:
    image: supabase/storage-api:v0.24.0
    depends_on:
      - supabase-db
      - supabase-rest
    environment:
      ANON_KEY: your-anon-key
      SERVICE_KEY: your-service-key
      POSTGREST_URL: http://supabase-rest:3000
      DATABASE_URL: postgres://postgres:postgres@supabase-db:5432/postgres
      JWT_SECRET: your-jwt-secret

  supabase-realtime:
    image: supabase/realtime:v0.22.7
    depends_on:
      - supabase-db
    environment:
      DB_HOST: supabase-db
      DB_PORT: 5432
      DB_NAME: postgres
      DB_USER: postgres
      DB_PASSWORD: postgres
      JWT_SECRET: your-jwt-secret
```

2. Запустите сервисы:
```bash
docker-compose up -d
```

## Настройка CI/CD

### GitHub Actions пример

Создайте `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
          
      - name: Build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
        run: |
          cd frontend
          npm run build
          
      - name: Deploy to Vercel
        run: |
          npm install -g vercel@latest
          vercel --prod --token=${{ secrets.VERCEL_TOKEN }}

  deploy-backend:
    runs-on: ubuntu-latest
    needs: deploy-frontend
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Supabase CLI
        run: |
          curl -L https://github.com/supabase/cli/releases/latest/download/supabase-linux-amd64.deb -o supabase-linux-amd64.deb
          sudo dpkg -i supabase-linux-amd64.deb
          
      - name: Push database changes
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
        run: |
          supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_ID }}
          supabase db push
```

## Мониторинг и логирование

### Frontend
- Настройте логирование ошибок (Sentry, LogRocket и т.д.)
- Настройте аналитику (опционально)
- Настройте health check endpoint

### Backend
- Включите логирование в Supabase Dashboard
- Настройте алерты для критических ошибок
- Настройте backup стратегию

## Безопасность

### HTTPS
- Обязательно используйте HTTPS для всех endpoints
- Настройте HSTS заголовки
- Используйте безопасные куки (secure, httpOnly, sameSite)

### Rate Limiting
- Настройте rate limiting на уровне приложения
- Используйте встроенные механизмы Supabase при необходимости

### Проверка обновлений
- Регулярно обновляйте зависимости
- Мониторьте уязвимости (npm audit, dependabot и т.д.)

## Тестирование развертывания

### Предварительные проверки
1. Проверьте доступность API endpoints
2. Проверьте работу аутентификации
3. Проверьте RLS политики
4. Проверьте работу всех основных функций приложения

### Тестирование функциональности
1. Регистрация и вход пользователя
2. Создание и редактирование счетов
3. Создание транзакций
4. Работа с бюджетами
5. Отчеты и аналитика
6. Совместная работа (приглашения, роли)

## Резервное копирование и восстановление

### База данных
- Настройте регулярные бэкапы PostgreSQL
- Проверьте возможность восстановления из бэкапа

### Приложение
- Используйте систему контроля версий (Git)
- Сохраняйте конфигурации и скрипты развертывания

## Откат изменений

В случае проблем с новым развертыванием:
1. Используйте предыдущую версию приложения
2. При необходимости восстановите базу данных из бэкапа
3. Обновите DNS записи (если применимо)
4. Проверьте работоспособность системы

## Заключение

После завершения развертывания:
1. Проверьте все функции приложения
2. Убедитесь в корректной работе безопасности
3. Настройте мониторинг
4. Документируйте процесс развертывания для вашей конкретной инфраструктуры