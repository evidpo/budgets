import {
  useMutation,
  useQueryClient,
  UseMutationOptions,
  UseMutationResult
} from '@tanstack/react-query';
import { api } from './api';
import {
  useRealtimeAccounts,
  useRealtimeTransactions,
  useRealtimeBudgets,
  useRealtimeCategories,
  useRealtimeDebts
} from '@/hooks/useRealtimeSubscription';
import {
  Account,
  Transaction,
  Transfer,
  Budget,
  Category,
  Debt,
  Rule,
  Household,
  Member,
  CreateAccountData,
  UpdateAccountData,
  CreateTransactionData,
  CreateTransferData,
  CreateBudgetData,
  UpdateBudgetData,
  CreateCategoryData,
  UpdateCategoryData,
  CreateDebtData,
  UpdateDebtData,
  CreateRuleData,
  UpdateRuleData
} from './types';

// Ключи для инвалидации кэша
const QUERY_KEYS = {
  households: ['households'],
  members: (householdId: string) => ['members', householdId],
  accounts: (householdId: string, includeBalance: boolean = false) => 
    ['accounts', householdId, includeBalance],
  transactions: (filter: any = {}) => ['transactions', filter],
  budgets: (householdId: string) => ['budgets', householdId],
  budget: (id: string) => ['budget', id],
  categories: (householdId: string) => ['categories', householdId],
  debts: (householdId: string) => ['debts', householdId],
  rules: (householdId: string) => ['rules', householdId],
};

// Мутации для работы с домохозяйствами
export const useCreateHouseholdMutation = (
  options?: UseMutationOptions<Household, Error, { name: string }>
): UseMutationResult<Household, Error, { name: string }> => {
  const queryClient = useQueryClient();

  return useMutation<Household, Error, { name: string }>({
    mutationFn: async ({ name }) => {
      const result = await api.createHousehold(name);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: (data, variables, context) => {
      // Инвалидируем список домохозяйств
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.households });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

// Мутации для работы со счетами
export const useCreateAccountMutation = (
  options?: UseMutationOptions<Account, Error, CreateAccountData>
): UseMutationResult<Account, Error, CreateAccountData> => {
  const queryClient = useQueryClient();

  return useMutation<Account, Error, CreateAccountData>({
    mutationFn: async (accountData) => {
      const result = await api.createAccount(accountData);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    onMutate: async (accountData) => {
      // Отменяем предыдущие запросы для предотвращения конфликта
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.accounts(accountData.household_id) });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.accounts(accountData.household_id, true) });
      
      // Сохраняем предыдущее состояние
      const previousAccounts = queryClient.getQueryData(QUERY_KEYS.accounts(accountData.household_id));
      const previousAccountsWithBalance = queryClient.getQueryData(QUERY_KEYS.accounts(accountData.household_id, true));
      
      // Оптимистично добавляем новый счет
      const newAccount = {
        id: `optimistic-${Date.now()}`,
        ...accountData,
        balance: accountData.opening_balance || 0,
        is_archived: false,
        note: accountData.note || '',
        sort_order: 0, // будет обновлено после получения реальных данных
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1
      } as Account;
      
      queryClient.setQueryData(QUERY_KEYS.accounts(accountData.household_id), (old: Account[] | undefined) => {
        return [...(old || []), newAccount];
      });
      
      queryClient.setQueryData(QUERY_KEYS.accounts(accountData.household_id, true), (old: Account[] | undefined) => {
        return [...(old || []), { ...newAccount, balance: newAccount.opening_balance || 0 }];
      });
      
      return { previousAccounts, previousAccountsWithBalance, householdId: accountData.household_id };
    },
    onError: (err, accountData, context) => {
      // Восстанавливаем предыдущее состояние при ошибке
      if (context) {
        queryClient.setQueryData(QUERY_KEYS.accounts(context.householdId), context.previousAccounts);
        queryClient.setQueryData(QUERY_KEYS.accounts(context.householdId, true), context.previousAccountsWithBalance);
      }
      options?.onError?.(err, accountData, context);
    },
    onSuccess: (data, variables, context) => {
      // После успешного создания, обновляем оптимистичный счет с реальными данными
      queryClient.setQueryData(QUERY_KEYS.accounts(data.household_id), (old: Account[] | undefined) => {
        if (!old) return old;
        
        return old.map(acc =>
          acc.id.startsWith('optimistic-') && acc.name === data.name && acc.type === data.type
            ? data
            : acc
        );
      });
      
      queryClient.setQueryData(QUERY_KEYS.accounts(data.household_id, true), (old: Account[] | undefined) => {
        if (!old) return old;
        
        return old.map(acc =>
          acc.id.startsWith('optimistic-') && acc.name === data.name && acc.type === data.type
            ? { ...data, balance: data.opening_balance || 0 }
            : acc
        );
      });
      
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useUpdateAccountMutation = (
  options?: UseMutationOptions<Account, Error, { id: string; data: UpdateAccountData }>
): UseMutationResult<Account, Error, { id: string; data: UpdateAccountData }> => {
  const queryClient = useQueryClient();

  return useMutation<Account, Error, { id: string; data: UpdateAccountData }>({
    mutationFn: async ({ id, data }) => {
      const result = await api.updateAccount(id, data);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: (data, variables, context) => {
      // Инвалидируем список счетов для соответствующего домохозяйства
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.accounts(data.household_id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.accounts(data.household_id, true) 
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useReorderAccountsMutation = (
  options?: UseMutationOptions<any, Error, { accounts: { id: string; sort_order: number }[]; householdId: string }>
): UseMutationResult<any, Error, { accounts: { id: string; sort_order: number }[]; householdId: string }> => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { accounts: { id: string; sort_order: number }[]; householdId: string }>({
    mutationFn: async ({ accounts }) => {
      const result = await api.reorderAccounts(accounts);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: (data, variables, context) => {
      // Инвалидируем список счетов для соответствующего домохозяйства
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.accounts(variables.householdId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.accounts(variables.householdId, true) 
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

// Мутации для работы с транзакциями
export const useCreateTransactionMutation = (
 options?: UseMutationOptions<Transaction, Error, CreateTransactionData>
): UseMutationResult<Transaction, Error, CreateTransactionData> => {
  const queryClient = useQueryClient();

  return useMutation<Transaction, Error, CreateTransactionData>({
    mutationFn: async (transactionData) => {
      const result = await api.createTransaction(transactionData);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    onMutate: async (transactionData) => {
      // Отменяем предыдущие запросы для предотвращения конфликта
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.transactions() });
      
      // Сохраняем предыдущее состояние
      const previousTransactions = queryClient.getQueryData(QUERY_KEYS.transactions());
      
      // Оптимистично добавляем новую транзакцию
      queryClient.setQueryData(QUERY_KEYS.transactions(), (old: Transaction[] | undefined) => {
        const newTransaction = {
          id: `optimistic-${Date.now()}`, // Временный ID для оптимистичного обновления
          ...transactionData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1
        } as Transaction;
        
        return [...(old || []), newTransaction];
      });
      
      // Также обновляем счета с балансами
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.accounts(transactionData.household_id, true) });
      const previousAccounts = queryClient.getQueryData(QUERY_KEYS.accounts(transactionData.household_id, true));
      
      return { previousTransactions, previousAccounts, householdId: transactionData.household_id };
    },
    onError: (err, transactionData, context) => {
      // Восстанавливаем предыдущее состояние при ошибке
      if (context) {
        queryClient.setQueryData(QUERY_KEYS.transactions(), context.previousTransactions);
        queryClient.setQueryData(QUERY_KEYS.accounts(context.householdId, true), context.previousAccounts);
      }
      options?.onError?.(err, transactionData, context);
    },
    onSuccess: (data, variables, context) => {
      // После успешного создания, обновляем оптимистичную транзакцию с реальными данными
      queryClient.setQueryData(QUERY_KEYS.transactions(), (old: Transaction[] | undefined) => {
        if (!old) return old;
        
        return old.map(t =>
          t.id.startsWith('optimistic-') && t.date === data.date && t.amount === data.amount && t.description === data.description
            ? data
            : t
        );
      });
      
      // Инвалидируем список счетов для обновления балансов
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.accounts(data.household_id, true)
      });
      
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useCreateTransferMutation = (
  options?: UseMutationOptions<{ fromTx: Transaction; toTx: Transaction; transfer: Transfer }, Error, CreateTransferData>
): UseMutationResult<{ fromTx: Transaction; toTx: Transaction; transfer: Transfer }, Error, CreateTransferData> => {
  const queryClient = useQueryClient();

  return useMutation<{ fromTx: Transaction; toTx: Transaction; transfer: Transfer }, Error, CreateTransferData>({
    mutationFn: async (transferData) => {
      const result = await api.createTransfer(transferData);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: (data, variables, context) => {
      // Инвалидируем список транзакций
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.transactions() 
      });
      // Инвалидируем список счетов для обновления балансов
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.accounts(data.fromTx.household_id, true) 
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

// Мутации для работы с бюджетами
export const useCreateBudgetMutation = (
  options?: UseMutationOptions<Budget, Error, CreateBudgetData>
): UseMutationResult<Budget, Error, CreateBudgetData> => {
  const queryClient = useQueryClient();

  return useMutation<Budget, Error, CreateBudgetData>({
    mutationFn: async (budgetData) => {
      const result = await api.createBudget(budgetData);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    onMutate: async (budgetData) => {
      // Отменяем предыдущие запросы для предотвращения конфликта
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.budgets(budgetData.household_id) });
      
      // Сохраняем предыдущее состояние
      const previousBudgets = queryClient.getQueryData(QUERY_KEYS.budgets(budgetData.household_id));
      
      // Оптимистично добавляем новый бюджет
      const newBudget = {
        id: `optimistic-${Date.now()}`,
        ...budgetData,
        sort_order: 0, // будет обновлено после получения реальных данных
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1
      } as Budget;
      
      queryClient.setQueryData(QUERY_KEYS.budgets(budgetData.household_id), (old: Budget[] | undefined) => {
        return [...(old || []), newBudget];
      });
      
      return { previousBudgets, householdId: budgetData.household_id };
    },
    onError: (err, budgetData, context) => {
      // Восстанавливаем предыдущее состояние при ошибке
      if (context) {
        queryClient.setQueryData(QUERY_KEYS.budgets(context.householdId), context.previousBudgets);
      }
      options?.onError?.(err, budgetData, context);
    },
    onSuccess: (data, variables, context) => {
      // После успешного создания, обновляем оптимистичный бюджет с реальными данными
      queryClient.setQueryData(QUERY_KEYS.budgets(data.household_id), (old: Budget[] | undefined) => {
        if (!old) return old;
        
        return old.map(b =>
          b.id.startsWith('optimistic-') && b.name === data.name && b.amount === data.amount
            ? data
            : b
        );
      });
      
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useUpdateBudgetMutation = (
  options?: UseMutationOptions<Budget, Error, { id: string; data: UpdateBudgetData }>
): UseMutationResult<Budget, Error, { id: string; data: UpdateBudgetData }> => {
  const queryClient = useQueryClient();

  return useMutation<Budget, Error, { id: string; data: UpdateBudgetData }>({
    mutationFn: async ({ id, data }) => {
      const result = await api.updateBudget(id, data);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: (data, variables, context) => {
      // Инвалидируем список бюджетов для соответствующего домохозяйства
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.budgets(data.household_id) 
      });
      // Инвалидируем конкретный бюджет
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.budget(data.id) 
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

// Мутации для работы с категориями
export const useCreateCategoryMutation = (
  options?: UseMutationOptions<Category, Error, CreateCategoryData>
): UseMutationResult<Category, Error, CreateCategoryData> => {
  const queryClient = useQueryClient();

  return useMutation<Category, Error, CreateCategoryData>({
    mutationFn: async (categoryData) => {
      const result = await api.createCategory(categoryData);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    onMutate: async (categoryData) => {
      // Отменяем предыдущие запросы для предотвращения конфликта
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.categories(categoryData.household_id) });
      
      // Сохраняем предыдущее состояние
      const previousCategories = queryClient.getQueryData(QUERY_KEYS.categories(categoryData.household_id));
      
      // Оптимистично добавляем новую категорию
      const newCategory = {
        id: `optimistic-${Date.now()}`,
        ...categoryData,
        path: categoryData.name, // будет обновлено после получения реальных данных
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1
      } as Category;
      
      queryClient.setQueryData(QUERY_KEYS.categories(categoryData.household_id), (old: Category[] | undefined) => {
        return [...(old || []), newCategory];
      });
      
      return { previousCategories, householdId: categoryData.household_id };
    },
    onError: (err, categoryData, context) => {
      // Восстанавливаем предыдущее состояние при ошибке
      if (context) {
        queryClient.setQueryData(QUERY_KEYS.categories(context.householdId), context.previousCategories);
      }
      options?.onError?.(err, categoryData, context);
    },
    onSuccess: (data, variables, context) => {
      // После успешного создания, обновляем оптимистичную категорию с реальными данными
      queryClient.setQueryData(QUERY_KEYS.categories(data.household_id), (old: Category[] | undefined) => {
        if (!old) return old;
        
        return old.map(c =>
          c.id.startsWith('optimistic-') && c.name === data.name && c.type === data.type
            ? data
            : c
        );
      });
      
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useUpdateCategoryMutation = (
  options?: UseMutationOptions<Category, Error, { id: string; data: UpdateCategoryData }>
): UseMutationResult<Category, Error, { id: string; data: UpdateCategoryData }> => {
  const queryClient = useQueryClient();

  return useMutation<Category, Error, { id: string; data: UpdateCategoryData }>({
    mutationFn: async ({ id, data }) => {
      const result = await api.updateCategory(id, data);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: (data, variables, context) => {
      // Инвалидируем список категорий для соответствующего домохозяйства
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.categories(data.household_id) 
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

// Мутации для работы с долгами
export const useCreateDebtMutation = (
 options?: UseMutationOptions<Debt, Error, CreateDebtData>
): UseMutationResult<Debt, Error, CreateDebtData> => {
  const queryClient = useQueryClient();

  return useMutation<Debt, Error, CreateDebtData>({
    mutationFn: async (debtData) => {
      const result = await api.createDebt(debtData);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    onMutate: async (debtData) => {
      // Отменяем предыдущие запросы для предотвращения конфликта
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.debts(debtData.household_id) });
      
      // Сохраняем предыдущее состояние
      const previousDebts = queryClient.getQueryData(QUERY_KEYS.debts(debtData.household_id));
      
      // Оптимистично добавляем новый долг
      const newDebt = {
        id: `optimistic-${Date.now()}`,
        ...debtData,
        opening_balance: debtData.opening_balance || debtData.amount,
        note: debtData.note || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1
      } as Debt;
      
      queryClient.setQueryData(QUERY_KEYS.debts(debtData.household_id), (old: Debt[] | undefined) => {
        return [...(old || []), newDebt];
      });
      
      return { previousDebts, householdId: debtData.household_id };
    },
    onError: (err, debtData, context) => {
      // Восстанавливаем предыдущее состояние при ошибке
      if (context) {
        queryClient.setQueryData(QUERY_KEYS.debts(context.householdId), context.previousDebts);
      }
      options?.onError?.(err, debtData, context);
    },
    onSuccess: (data, variables, context) => {
      // После успешного создания, обновляем оптимистичный долг с реальными данными
      queryClient.setQueryData(QUERY_KEYS.debts(data.household_id), (old: Debt[] | undefined) => {
        if (!old) return old;
        
        return old.map(d =>
          d.id.startsWith('optimistic-') && d.name === data.name && d.amount === data.amount
            ? data
            : d
        );
      });
      
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useUpdateDebtMutation = (
 options?: UseMutationOptions<Debt, Error, { id: string; data: UpdateDebtData }>
): UseMutationResult<Debt, Error, { id: string; data: UpdateDebtData }> => {
  const queryClient = useQueryClient();

  return useMutation<Debt, Error, { id: string; data: UpdateDebtData }>({
    mutationFn: async ({ id, data }) => {
      const result = await api.updateDebt(id, data);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: (data, variables, context) => {
      // Инвалидируем список долгов для соответствующего домохозяйства
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.debts(data.household_id) 
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

// Мутации для работы с правилами
export const useCreateRuleMutation = (
  options?: UseMutationOptions<Rule, Error, CreateRuleData>
): UseMutationResult<Rule, Error, CreateRuleData> => {
  const queryClient = useQueryClient();

  return useMutation<Rule, Error, CreateRuleData>({
    mutationFn: async (ruleData) => {
      const result = await api.createRule(ruleData);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: (data, variables, context) => {
      // Инвалидируем список правил для соответствующего домохозяйства
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.rules(data.household_id) 
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useUpdateRuleMutation = (
  options?: UseMutationOptions<Rule, Error, { id: string; data: UpdateRuleData }>
): UseMutationResult<Rule, Error, { id: string; data: UpdateRuleData }> => {
  const queryClient = useQueryClient();

  return useMutation<Rule, Error, { id: string; data: UpdateRuleData }>({
    mutationFn: async ({ id, data }) => {
      const result = await api.updateRule(id, data);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: (data, variables, context) => {
      // Инвалидируем список правил для соответствующего домохозяйства
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.rules(data.household_id) 
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};