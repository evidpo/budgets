import { supabase } from './supabase';
import { ErrorHandler, AppError } from './errorHandler';
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
  TransactionFilter,
  BudgetComputeParams,
  BudgetComputeResult,
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
  UpdateRuleData,
  ApiResponse,
  PaginatedResponse
} from './types';

// Сервис для работы с API
class ApiService {
  // Методы для работы с домохозяйствами
  async getHouseholds(): Promise<ApiResponse<Household[]>> {
    try {
      const { data, error } = await supabase
        .from('households')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        const appError = ErrorHandler.convertError(error);
        ErrorHandler.logError(appError, 'getHouseholds');
        return { data: null, error: appError.message };
      }

      return { data, error: null };
    } catch (error: any) {
      const appError = ErrorHandler.convertError(error);
      ErrorHandler.logError(appError, 'getHouseholds');
      return { data: null, error: appError.message };
    }
  }

 async createHousehold(name: string): Promise<ApiResponse<Household>> {
    try {
      const { data, error } = await supabase
        .from('households')
        .insert([{ name }])
        .select()
        .single();

      if (error) {
        const appError = ErrorHandler.convertError(error);
        ErrorHandler.logError(appError, 'createHousehold');
        return { data: null, error: appError.message };
      }

      return { data, error: null };
    } catch (error: any) {
      const appError = ErrorHandler.convertError(error);
      ErrorHandler.logError(appError, 'createHousehold');
      return { data: null, error: appError.message };
    }
  }

 // Методы для работы с участниками
  async getMembers(householdId: string): Promise<ApiResponse<Member[]>> {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: true });

      if (error) {
        const appError = ErrorHandler.convertError(error);
        ErrorHandler.logError(appError, 'getMembers');
        return { data: null, error: appError.message };
      }

      return { data, error: null };
    } catch (error: any) {
      const appError = ErrorHandler.convertError(error);
      ErrorHandler.logError(appError, 'getMembers');
      return { data: null, error: appError.message };
    }
  }

 // Методы для работы со счетами
  async getAccounts(householdId: string, includeBalance: boolean = false): Promise<ApiResponse<Account[]>> {
    try {
      let query = supabase
        .from('accounts')
        .select(includeBalance ? '*' : 'id, household_id, name, type, currency, opening_balance, is_archived, note, sort_order, created_at, updated_at, version')
        .eq('household_id', householdId)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (includeBalance) {
        // Вызов кастомной функции для вычисления баланса
        const { data, error } = await supabase
          .rpc('calculate_accounts_with_balance', { household_id: householdId });

        if (error) {
          const appError = ErrorHandler.convertError(error);
          ErrorHandler.logError(appError, 'getAccounts (with balance)');
          return { data: null, error: appError.message };
        }

        return { data, error: null };
      } else {
        const { data, error } = await query;

        if (error) {
          const appError = ErrorHandler.convertError(error);
          ErrorHandler.logError(appError, 'getAccounts');
          return { data: null, error: appError.message };
        }

        return { data, error: null };
      }
    } catch (error: any) {
      const appError = ErrorHandler.convertError(error);
      ErrorHandler.logError(appError, 'getAccounts');
      return { data: null, error: appError.message };
    }
  }

  async createAccount(accountData: CreateAccountData): Promise<ApiResponse<Account>> {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .insert([accountData])
        .select()
        .single();

      if (error) {
        const appError = ErrorHandler.convertError(error);
        ErrorHandler.logError(appError, 'createAccount');
        return { data: null, error: appError.message };
      }

      return { data, error: null };
    } catch (error: any) {
      const appError = ErrorHandler.convertError(error);
      ErrorHandler.logError(appError, 'createAccount');
      return { data: null, error: appError.message };
    }
  }

 async updateAccount(id: string, accountData: UpdateAccountData): Promise<ApiResponse<Account>> {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .update(accountData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        const appError = ErrorHandler.convertError(error);
        ErrorHandler.logError(appError, 'updateAccount');
        return { data: null, error: appError.message };
      }

      return { data, error: null };
    } catch (error: any) {
      const appError = ErrorHandler.convertError(error);
      ErrorHandler.logError(appError, 'updateAccount');
      return { data: null, error: appError.message };
    }
 }

  async reorderAccounts(accounts: { id: string; sort_order: number }[]): Promise<ApiResponse<any>> {
    try {
      // Обновляем порядок счетов в батч-режиме
      const updates = accounts.map(account =>
        supabase
          .from('accounts')
          .update({ sort_order: account.sort_order })
          .eq('id', account.id)
      );

      // Выполняем все обновления
      const results = await Promise.all(updates.map(update => update.select().single()));

      // Проверяем, были ли ошибки
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        const appError = ErrorHandler.convertError(errors[0].error || new Error('Ошибка при обновлении порядка счетов'));
        ErrorHandler.logError(appError, 'reorderAccounts');
        return { data: null, error: appError.message };
      }

      return { data: results.map(r => r.data), error: null };
    } catch (error: any) {
      const appError = ErrorHandler.convertError(error);
      ErrorHandler.logError(appError, 'reorderAccounts');
      return { data: null, error: appError.message };
    }
  }

  // Методы для работы с транзакциями
   async getTransactions(filter: TransactionFilter = {}): Promise<ApiResponse<Transaction[]>> {
     try {
       let query = supabase
         .from('transactions')
         .select('*')
         .order('date', { ascending: false });

       // Применяем фильтры
       if (filter.from_date) {
         query = query.gte('date', filter.from_date);
       }
       if (filter.to_date) {
         query = query.lte('date', filter.to_date);
       }
       if (filter.account_ids && filter.account_ids.length > 0) {
         query = query.in('account_id', filter.account_ids);
       }
       if (filter.category_ids && filter.category_ids.length > 0) {
         query = query.in('category_id', filter.category_ids);
       }
       if (filter.member_id) {
         query = query.eq('member_id', filter.member_id);
       }
       if (filter.debt_id) {
         query = query.eq('debt_id', filter.debt_id);
       }
       if (filter.exclude_transfers) {
         query = query.is('transfer_id', null);
       }

       const { data, error } = await query;

       if (error) {
         const appError = ErrorHandler.convertError(error);
         ErrorHandler.logError(appError, 'getTransactions');
         return { data: null, error: appError.message };
       }

       return { data, error: null };
     } catch (error: any) {
       const appError = ErrorHandler.convertError(error);
       ErrorHandler.logError(appError, 'getTransactions');
       return { data: null, error: appError.message };
     }
   }

  async createTransaction(transactionData: CreateTransactionData): Promise<ApiResponse<Transaction>> {
     try {
       const { data, error } = await supabase
         .from('transactions')
         .insert([transactionData])
         .select()
         .single();

       if (error) {
         const appError = ErrorHandler.convertError(error);
         ErrorHandler.logError(appError, 'createTransaction');
         return { data: null, error: appError.message };
       }

       return { data, error: null };
     } catch (error: any) {
       const appError = ErrorHandler.convertError(error);
       ErrorHandler.logError(appError, 'createTransaction');
       return { data: null, error: appError.message };
     }
   }

 async createTransfer(transferData: CreateTransferData): Promise<ApiResponse<{ fromTx: Transaction; toTx: Transaction; transfer: Transfer }>> {
    try {
      // Создаем транзакции и перевод в одной транзакции с помощью RPC
      const { data, error } = await supabase
        .rpc('create_transfer', {
          from_account_id: transferData.from_account_id,
          to_account_id: transferData.to_account_id,
          amount: transferData.amount,
          date: transferData.date,
          note: transferData.note || null
        });

      if (error) {
        const appError = ErrorHandler.convertError(error);
        ErrorHandler.logError(appError, 'createTransfer');
        return { data: null, error: appError.message };
      }

      // Результат RPC возвращает объект с транзакциями и переводом
      return { data, error: null };
    } catch (error: any) {
      const appError = ErrorHandler.convertError(error);
      ErrorHandler.logError(appError, 'createTransfer');
      return { data: null, error: appError.message };
    }
  }

 // Методы для работы с бюджетами
  async getBudgets(householdId: string): Promise<ApiResponse<Budget[]>> {
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('household_id', householdId)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        const appError = ErrorHandler.convertError(error);
        ErrorHandler.logError(appError, 'getBudgets');
        return { data: null, error: appError.message };
      }

      return { data, error: null };
    } catch (error: any) {
      const appError = ErrorHandler.convertError(error);
      ErrorHandler.logError(appError, 'getBudgets');
      return { data: null, error: appError.message };
    }
  }

  async getBudget(id: string): Promise<ApiResponse<Budget>> {
     try {
       const { data, error } = await supabase
         .from('budgets')
         .select('*')
         .eq('id', id)
         .single();

       if (error) {
         const appError = ErrorHandler.convertError(error);
         ErrorHandler.logError(appError, 'getBudget');
         return { data: null, error: appError.message };
       }

       return { data, error: null };
     } catch (error: any) {
       const appError = ErrorHandler.convertError(error);
       ErrorHandler.logError(appError, 'getBudget');
       return { data: null, error: appError.message };
     }
   }

  async createBudget(budgetData: CreateBudgetData): Promise<ApiResponse<Budget>> {
     try {
       const { data, error } = await supabase
         .from('budgets')
         .insert([budgetData])
         .select()
         .single();

       if (error) {
         const appError = ErrorHandler.convertError(error);
         ErrorHandler.logError(appError, 'createBudget');
         return { data: null, error: appError.message };
       }

       return { data, error: null };
     } catch (error: any) {
       const appError = ErrorHandler.convertError(error);
       ErrorHandler.logError(appError, 'createBudget');
       return { data: null, error: appError.message };
     }
   }

 async updateBudget(id: string, budgetData: UpdateBudgetData): Promise<ApiResponse<Budget>> {
    try {
      const { data, error } = await supabase
        .from('budgets')
        .update(budgetData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        const appError = ErrorHandler.convertError(error);
        ErrorHandler.logError(appError, 'updateBudget');
        return { data: null, error: appError.message };
      }

      return { data, error: null };
    } catch (error: any) {
      const appError = ErrorHandler.convertError(error);
      ErrorHandler.logError(appError, 'updateBudget');
      return { data: null, error: appError.message };
    }
  }

 async computeBudget(budgetId: string, params: BudgetComputeParams): Promise<ApiResponse<BudgetComputeResult>> {
    try {
      const { data, error } = await supabase
        .rpc('calculate_budget_available', {
          budget_id: budgetId,
          as_of_date: params.as_of
        });

      if (error) {
        const appError = ErrorHandler.convertError(error);
        ErrorHandler.logError(appError, 'computeBudget');
        return { data: null, error: appError.message };
      }

      // Функция возвращает массив, но нам нужен первый элемент
      return { data: data[0], error: null };
    } catch (error: any) {
      const appError = ErrorHandler.convertError(error);
      ErrorHandler.logError(appError, 'computeBudget');
      return { data: null, error: appError.message };
    }
  }

 // Методы для работы с категориями
  async getCategories(householdId: string): Promise<ApiResponse<Category[]>> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('household_id', householdId)
        .order('path', { ascending: true });

      if (error) {
        const appError = ErrorHandler.convertError(error);
        ErrorHandler.logError(appError, 'getCategories');
        return { data: null, error: appError.message };
      }

      return { data, error: null };
    } catch (error: any) {
      const appError = ErrorHandler.convertError(error);
      ErrorHandler.logError(appError, 'getCategories');
      return { data: null, error: appError.message };
    }
 }

   async createCategory(categoryData: CreateCategoryData): Promise<ApiResponse<Category>> {
      try {
        const { data, error } = await supabase
          .from('categories')
          .insert([categoryData])
          .select()
          .single();
 
        if (error) {
          const appError = ErrorHandler.convertError(error);
          ErrorHandler.logError(appError, 'createCategory');
          return { data: null, error: appError.message };
        }
 
        return { data, error: null };
      } catch (error: any) {
        const appError = ErrorHandler.convertError(error);
        ErrorHandler.logError(appError, 'createCategory');
        return { data: null, error: appError.message };
      }
    }

 async updateCategory(id: string, categoryData: UpdateCategoryData): Promise<ApiResponse<Category>> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .update(categoryData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        const appError = ErrorHandler.convertError(error);
        ErrorHandler.logError(appError, 'updateCategory');
        return { data: null, error: appError.message };
      }

      return { data, error: null };
    } catch (error: any) {
      const appError = ErrorHandler.convertError(error);
      ErrorHandler.logError(appError, 'updateCategory');
      return { data: null, error: appError.message };
    }
  }

  // Методы для работы с долгами
   async getDebts(householdId: string): Promise<ApiResponse<Debt[]>> {
     try {
       const { data, error } = await supabase
         .from('debts')
         .select('*')
         .eq('household_id', householdId)
         .order('name', { ascending: true });

       if (error) {
         const appError = ErrorHandler.convertError(error);
         ErrorHandler.logError(appError, 'getDebts');
         return { data: null, error: appError.message };
       }

       return { data, error: null };
     } catch (error: any) {
       const appError = ErrorHandler.convertError(error);
       ErrorHandler.logError(appError, 'getDebts');
       return { data: null, error: appError.message };
     }
  }

  async createDebt(debtData: CreateDebtData): Promise<ApiResponse<Debt>> {
     try {
       const { data, error } = await supabase
         .from('debts')
         .insert([debtData])
         .select()
         .single();

       if (error) {
         const appError = ErrorHandler.convertError(error);
         ErrorHandler.logError(appError, 'createDebt');
         return { data: null, error: appError.message };
       }

       return { data, error: null };
     } catch (error: any) {
       const appError = ErrorHandler.convertError(error);
       ErrorHandler.logError(appError, 'createDebt');
       return { data: null, error: appError.message };
     }
  }

  async updateDebt(id: string, debtData: UpdateDebtData): Promise<ApiResponse<Debt>> {
     try {
       const { data, error } = await supabase
         .from('debts')
         .update(debtData)
         .eq('id', id)
         .select()
         .single();

       if (error) {
         const appError = ErrorHandler.convertError(error);
         ErrorHandler.logError(appError, 'updateDebt');
         return { data: null, error: appError.message };
       }

       return { data, error: null };
     } catch (error: any) {
       const appError = ErrorHandler.convertError(error);
       ErrorHandler.logError(appError, 'updateDebt');
       return { data: null, error: appError.message };
     }
  }

  // Методы для работы с правилами
   async getRules(householdId: string): Promise<ApiResponse<Rule[]>> {
     try {
       const { data, error } = await supabase
         .from('rules')
         .select('*')
         .eq('household_id', householdId)
         .order('priority', { ascending: false }); // Более высокий приоритет первее

       if (error) {
         const appError = ErrorHandler.convertError(error);
         ErrorHandler.logError(appError, 'getRules');
         return { data: null, error: appError.message };
       }

       return { data, error: null };
     } catch (error: any) {
       const appError = ErrorHandler.convertError(error);
       ErrorHandler.logError(appError, 'getRules');
       return { data: null, error: appError.message };
     }
  }

  async createRule(ruleData: CreateRuleData): Promise<ApiResponse<Rule>> {
     try {
       const { data, error } = await supabase
         .from('rules')
         .insert([ruleData])
         .select()
         .single();

       if (error) {
         const appError = ErrorHandler.convertError(error);
         ErrorHandler.logError(appError, 'createRule');
         return { data: null, error: appError.message };
       }

       return { data, error: null };
     } catch (error: any) {
       const appError = ErrorHandler.convertError(error);
       ErrorHandler.logError(appError, 'createRule');
       return { data: null, error: appError.message };
     }
  }

  async updateRule(id: string, ruleData: UpdateRuleData): Promise<ApiResponse<Rule>> {
     try {
       const { data, error } = await supabase
         .from('rules')
         .update(ruleData)
         .eq('id', id)
         .select()
         .single();

       if (error) {
         const appError = ErrorHandler.convertError(error);
         ErrorHandler.logError(appError, 'updateRule');
         return { data: null, error: appError.message };
       }

       return { data, error: null };
     } catch (error: any) {
       const appError = ErrorHandler.convertError(error);
       ErrorHandler.logError(appError, 'updateRule');
       return { data: null, error: appError.message };
     }
   }

  // Методы для импорта транзакций
   async importTransactions(transactions: CreateTransactionData[], importId: string): Promise<ApiResponse<any>> {
     try {
       // Вызов RPC функции для импорта транзакций
       const { data, error } = await supabase
         .rpc('import_transactions', {
           transactions_data: transactions,
           import_id: importId
         });

       if (error) {
         const appError = ErrorHandler.convertError(error);
         ErrorHandler.logError(appError, 'importTransactions');
         return { data: null, error: appError.message };
       }

       return { data, error: null };
     } catch (error: any) {
       const appError = ErrorHandler.convertError(error);
       ErrorHandler.logError(appError, 'importTransactions');
       return { data: null, error: appError.message };
     }
   }

   // Метод для отката импорта
    async rollbackImport(importId: string): Promise<ApiResponse<any>> {
      try {
        // Вызов RPC функции для отката импорта
        const { data, error } = await supabase
          .rpc('rollback_import', {
            import_id: importId
          });
 
        if (error) {
          const appError = ErrorHandler.convertError(error);
          ErrorHandler.logError(appError, 'rollbackImport');
          return { data: null, error: appError.message };
        }
 
        return { data, error: null };
      } catch (error: any) {
        const appError = ErrorHandler.convertError(error);
        ErrorHandler.logError(appError, 'rollbackImport');
        return { data: null, error: appError.message };
      }
   }
}

// Экспортируем экземпляр сервиса
export const api = new ApiService();

// Экспортируем тип сервиса для использования в других местах
export type ApiServiceType = typeof api;