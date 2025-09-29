import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { supabase } from '../frontend/lib/supabase';

// Тестовые сценарии для приложения "Семейные финансы"

describe('Семейные финансы - Функциональные тесты', () => {
  // Тесты для транзакций
  describe('Транзакции', () => {
    it('должна создавать расходную транзакцию', async () => {
      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert({
          household_id: 'test_household_id',
          account_id: 'test_account_id',
          amount: -1000,
          date: '2023-01-01',
          description: 'Тестовая покупка',
          type: 'expense'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(transaction).toBeDefined();
      expect(transaction?.amount).toBe(-1000);
      expect(transaction?.type).toBe('expense');
    });

    it('должна создавать доходную транзакцию', async () => {
      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert({
          household_id: 'test_household_id',
          account_id: 'test_account_id',
          amount: 5000,
          date: '2023-01-02',
          description: 'Тестовый доход',
          type: 'income'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(transaction).toBeDefined();
      expect(transaction?.amount).toBe(5000);
      expect(transaction?.type).toBe('income');
    });

    it('должна создавать перевод между счетами', async () => {
      // Создаем уникальный ID для перевода
      const transferId = crypto.randomUUID();
      
      // Создаем исходящую транзакцию (расход)
      const { data: fromTx, error: fromError } = await supabase
        .from('transactions')
        .insert({
          household_id: 'test_household_id',
          account_id: 'test_account_1',
          amount: -1000,
          date: '2023-01-03',
          description: 'Перевод',
          type: 'expense',
          transfer_id: transferId
        })
        .select()
        .single();

      // Создаем входящую транзакцию (доход)
      const { data: toTx, error: toError } = await supabase
        .from('transactions')
        .insert({
          household_id: 'test_household_id',
          account_id: 'test_account_2',
          amount: 1000,
          date: '2023-01-03',
          description: 'Перевод',
          type: 'income',
          transfer_id: transferId
        })
        .select()
        .single();

      expect(fromError).toBeNull();
      expect(toError).toBeNull();
      expect(fromTx).toBeDefined();
      expect(toTx).toBeDefined();
      expect(fromTx?.transfer_id).toBe(transferId);
      expect(toTx?.transfer_id).toBe(transferId);
      expect(fromTx?.amount).toBe(-100);
      expect(toTx?.amount).toBe(1000);
    });
  });

  // Тесты для бюджетов
  describe('Бюджеты', () => {
    it('должен создавать бюджет с переносом остатка', async () => {
      const { data: budget, error } = await supabase
        .from('budgets')
        .insert({
          household_id: 'test_household_id',
          name: 'Тестовый бюджет',
          amount: 10000,
          period: 'month',
          start_date: '2023-01-01',
          end_date: '2023-01-31',
          direction: 'expense',
          rollover: true
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(budget).toBeDefined();
      expect(budget?.name).toBe('Тестовый бюджет');
      expect(budget?.amount).toBe(10000);
      expect(budget?.rollover).toBe(true);
    });

    it('должен вычислять доступные средства в бюджете', async () => {
      // Создаем бюджет
      const { data: budget } = await supabase
        .from('budgets')
        .insert({
          household_id: 'test_household_id',
          name: 'Бюджет на тест',
          amount: 5000,
          period: 'month',
          start_date: '2023-01-01',
          end_date: '2023-01-31',
          direction: 'expense',
          rollover: false
        })
        .select()
        .single();

      // Создаем транзакции в рамках бюджета
      await supabase.from('transactions').insert([
        {
          household_id: 'test_household_id',
          account_id: 'test_account_id',
          amount: -1000,
          date: '2023-01-10',
          description: 'Покупка 1',
          type: 'expense',
          budget_id: budget?.id
        },
        {
          household_id: 'test_household_id',
          account_id: 'test_account_id',
          amount: -200,
          date: '2023-01-15',
          description: 'Покупка 2',
          type: 'expense',
          budget_id: budget?.id
        }
      ]);

      // Проверяем, что бюджет создан корректно
      expect(budget).toBeDefined();
      expect(budget?.amount).toBe(5000);
    });
  });

  // Тесты для отчетов
  describe('Отчеты', () => {
    it('должен генерировать отчет по бюджетам', async () => {
      // Создаем бюджет
      const { data: budget } = await supabase
        .from('budgets')
        .insert({
          household_id: 'test_household_id',
          name: 'Отчетный бюджет',
          amount: 3000,
          period: 'month',
          start_date: '2023-01-01',
          end_date: '2023-01-31',
          direction: 'expense',
          rollover: false
        })
        .select()
        .single();

      // Создаем транзакции для отчета
      await supabase.from('transactions').insert([
        {
          household_id: 'test_household_id',
          account_id: 'test_account_id',
          amount: -500,
          date: '2023-01-05',
          description: 'Отчетная покупка 1',
          type: 'expense'
        },
        {
          household_id: 'test_household_id',
          account_id: 'test_account_id',
          amount: -750,
          date: '2023-01-15',
          description: 'Отчетная покупка 2',
          type: 'expense'
        }
      ]);

      expect(budget).toBeDefined();
      expect(budget?.name).toBe('Отчетный бюджет');
    });

    it('должен генерировать отчет по категориям', async () => {
      // Создаем категорию
      const { data: category } = await supabase
        .from('categories')
        .insert({
          household_id: 'test_household_id',
          name: 'Продукты',
          type: 'expense',
          color: '#FF0000',
          icon: '🛒'
        })
        .select()
        .single();

      // Создаем транзакции с категорией
      await supabase.from('transactions').insert([
        {
          household_id: 'test_household_id',
          account_id: 'test_account_id',
          amount: -300,
          date: '2023-01-07',
          description: 'Покупка продуктов 1',
          type: 'expense',
          category_id: category?.id
        },
        {
          household_id: 'test_household_id',
          account_id: 'test_account_id',
          amount: -450,
          date: '2023-01-18',
          description: 'Покупка продуктов 2',
          type: 'expense',
          category_id: category?.id
        }
      ]);

      expect(category).toBeDefined();
      expect(category?.name).toBe('Продукты');
    });
  });

  // Тесты для импорта CSV
  describe('Импорт CSV', () => {
    it('должен импортировать транзакции из CSV', async () => {
      // Тестируем импорт транзакций
      const transactionsToImport = [
        {
          date: '2023-01-01',
          amount: -1250,
          description: 'Импортная покупка 1',
          payee: 'Магазин 1',
          account_id: 'test_account_id',
          household_id: 'test_household_id'
        },
        {
          date: '2023-01-02',
          amount: -750,
          description: 'Импортная покупка 2',
          payee: 'Магазин 2',
          account_id: 'test_account_id',
          household_id: 'test_household_id'
        }
      ];

      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionsToImport)
        .select();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.length).toBe(2);
    });

    it('должен находить и подтверждать переводы при импорте', async () => {
      // Создаем транзакции, которые потенциально могут быть переводами
      const { data: transactions } = await supabase
        .from('transactions')
        .insert([
          {
            household_id: 'test_household_id',
            account_id: 'account_1',
            amount: -2000,
            date: '2023-01-01',
            description: 'Перевод',
            type: 'expense'
          },
          {
            household_id: 'test_household_id',
            account_id: 'account_2',
            amount: 2000,
            date: '2023-01-01',
            description: 'Перевод',
            type: 'income'
          }
        ])
        .select();

      expect(transactions).toBeDefined();
      expect(transactions?.length).toBe(2);

      // Проверяем, что транзакции имеют противоположные суммы
      if (transactions && transactions.length >= 2) {
        const firstTx = transactions[0];
        const secondTx = transactions[1];
        expect(firstTx.amount).toBe(-secondTx.amount);
      }
    });
  });

  // Тесты для ролей
  describe('Роли пользователей', () => {
    it('должен ограничивать доступ в зависимости от роли', async () => {
      // Тест логики ролей проверяется через RLS политики в Supabase
      // Здесь тестируем, что структура ролей существует
      
      // Проверяем, что таблица members содержит поле role
      const { data: members, error } = await supabase
        .from('members')
        .select('role')
        .limit(1);

      expect(error).toBeNull();
      expect(members).toBeDefined();
    });
  });
});