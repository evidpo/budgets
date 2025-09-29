import { useQuery, useQueries, useInfiniteQuery, UseQueryOptions, UseInfiniteQueryOptions } from '@tanstack/react-query';
import { api } from './api';
import { ErrorHandler } from './errorHandler';
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
  Budget,
  Category,
  Debt,
  Rule,
  Household,
  Member,
  TransactionFilter,
  BudgetComputeParams,
  BudgetComputeResult
} from './types';

// Ключи для кэширования запросов
const QUERY_KEYS = {
  households: ['households'] as const,
  members: (householdId: string) => ['members', householdId] as const,
  accounts: (householdId: string, includeBalance: boolean = false) => 
    ['accounts', householdId, includeBalance] as const,
  transactions: (filter: TransactionFilter = {}) => 
    ['transactions', filter] as const,
  budgets: (householdId: string) => ['budgets', householdId] as const,
  budget: (id: string) => ['budget', id] as const,
  budgetCompute: (budgetId: string, params: BudgetComputeParams) => 
    ['budgetCompute', budgetId, params] as const,
  categories: (householdId: string) => ['categories', householdId] as const,
  debts: (householdId: string) => ['debts', householdId] as const,
  rules: (householdId: string) => ['rules', householdId] as const,
};

// Хуки для получения домохозяйств
export const useHouseholds = (options?: UseQueryOptions<Household[], Error>) => {
  return useQuery<Household[]>({
    queryKey: QUERY_KEYS.households,
    queryFn: async () => {
      const result = await api.getHouseholds();
      if (result.error) {
        const appError = ErrorHandler.convertError(result.error);
        ErrorHandler.logError(appError, 'useHouseholds');
        throw new Error(appError.message);
      }
      return result.data!;
    },
    ...options,
  });
};

// Хуки для получения участников
export const useMembers = (householdId: string, options?: UseQueryOptions<Member[], Error>) => {
  return useQuery<Member[]>({
    queryKey: QUERY_KEYS.members(householdId),
    queryFn: async () => {
      const result = await api.getMembers(householdId);
      if (result.error) {
        const appError = ErrorHandler.convertError(result.error);
        ErrorHandler.logError(appError, 'useMembers');
        throw new Error(appError.message);
      }
      return result.data!;
    },
    enabled: !!householdId,
    ...options,
  });
};

// Хуки для получения счетов
export const useAccounts = (householdId: string, includeBalance: boolean = false, options?: UseQueryOptions<Account[], Error>) => {
  const { data, isLoading, error, refetch } = useRealtimeAccounts({ householdId, includeBalance });
  
  return {
    data,
    isLoading,
    error,
    refetch,
    isFetching: false, // Временно устанавливаем в false, пока не реализуем полный функционал
  };
};

// Хуки для получения транзакций
export const useTransactions = (filter: TransactionFilter = {}, options?: UseQueryOptions<Transaction[], Error>) => {
  const { data, isLoading, error, refetch } = useRealtimeTransactions({ filter });
  
  return {
    data,
    isLoading,
    error,
    refetch,
    isFetching: false, // Временно устанавливаем в false, пока не реализуем полный функционал
  };
};

// Хуки для получения бюджетов
export const useBudgets = (householdId: string, options?: UseQueryOptions<Budget[], Error>) => {
 const { data, isLoading, error, refetch } = useRealtimeBudgets({ householdId });
  
  return {
    data,
    isLoading,
    error,
    refetch,
    isFetching: false, // Временно устанавливаем в false, пока не реализуем полный функционал
  };
};

// Хук для получения конкретного бюджета
export const useBudget = (id: string, options?: UseQueryOptions<Budget, Error>) => {
  return useQuery<Budget>({
    queryKey: QUERY_KEYS.budget(id),
    queryFn: async () => {
      const result = await api.getBudget(id);
      if (result.error) {
        const appError = ErrorHandler.convertError(result.error);
        ErrorHandler.logError(appError, 'useBudget');
        throw new Error(appError.message);
      }
      return result.data!;
    },
    enabled: !!id,
    ...options,
  });
};

// Хук для вычисления бюджета
export const useBudgetCompute = (budgetId: string, params: BudgetComputeParams, options?: UseQueryOptions<BudgetComputeResult, Error>) => {
  return useQuery<BudgetComputeResult>({
    queryKey: QUERY_KEYS.budgetCompute(budgetId, params),
    queryFn: async () => {
      const result = await api.computeBudget(budgetId, params);
      if (result.error) {
        const appError = ErrorHandler.convertError(result.error);
        ErrorHandler.logError(appError, 'useBudgetCompute');
        throw new Error(appError.message);
      }
      return result.data!;
    },
    enabled: !!budgetId,
    ...options,
  });
};

// Хуки для получения категорий
export const useCategories = (householdId: string, options?: UseQueryOptions<Category[], Error>) => {
  const { data, isLoading, error, refetch } = useRealtimeCategories({ householdId });
  
  return {
    data,
    isLoading,
    error,
    refetch,
    isFetching: false, // Временно устанавливаем в false, пока не реализуем полный функционал
  };
};

// Хуки для получения долгов
export const useDebts = (householdId: string, options?: UseQueryOptions<Debt[], Error>) => {
  const { data, isLoading, error, refetch } = useRealtimeDebts({ householdId });
  
  return {
    data,
    isLoading,
    error,
    refetch,
    isFetching: false, // Временно устанавливаем в false, пока не реализуем полный функционал
  };
};

// Хуки для получения правил
export const useRules = (householdId: string, options?: UseQueryOptions<Rule[], Error>) => {
  return useQuery<Rule[]>({
    queryKey: QUERY_KEYS.rules(householdId),
    queryFn: async () => {
      const result = await api.getRules(householdId);
      if (result.error) {
        const appError = ErrorHandler.convertError(result.error);
        ErrorHandler.logError(appError, 'useRules');
        throw new Error(appError.message);
      }
      return result.data!;
    },
    enabled: !!householdId,
    ...options,
  });
};

// Комбинированные хуки для получения связанных данных
export const useHouseholdData = (householdId: string) => {
  const accountsQuery = useRealtimeAccounts({ householdId });
  const transactionsQuery = useRealtimeTransactions({ filter: { from_date: new Date().toISOString().split('T')[0] } });
  const budgetsQuery = useRealtimeBudgets({ householdId });
  const categoriesQuery = useRealtimeCategories({ householdId });

  return [
    accountsQuery,
    transactionsQuery,
    budgetsQuery,
    categoriesQuery
  ];
};