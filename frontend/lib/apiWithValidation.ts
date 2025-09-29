import { api } from './api';
import { 
 createAccountSchema, 
  updateAccountSchema, 
  createTransactionSchema, 
 createBudgetSchema, 
  updateBudgetSchema, 
  createCategorySchema, 
  updateCategorySchema, 
  createDebtSchema, 
  updateDebtSchema, 
  createRuleSchema, 
  updateRuleSchema 
} from './validation/zodSchemas';
import { 
  CreateAccountData, 
  UpdateAccountData, 
  CreateTransactionData, 
  CreateBudgetData, 
  UpdateBudgetData, 
  CreateCategoryData, 
  UpdateCategoryData, 
  CreateDebtData, 
  UpdateDebtData, 
  CreateRuleData, 
  UpdateRuleData,
  ApiResponse 
} from './types';

// Обертка для API с валидацией
class ValidatedApiService {
  // Методы для работы со счетами
  async createAccount(accountData: CreateAccountData): Promise<ApiResponse<any>> {
    try {
      // Валидируем данные перед отправкой
      const validatedData = createAccountSchema.parse(accountData);
      return await api.createAccount(validatedData);
    } catch (error: any) {
      // Возвращаем ошибку валидации
      return { 
        data: null, 
        error: error.message || 'Ошибка валидации данных счёта' 
      };
    }
  }

  async updateAccount(id: string, accountData: UpdateAccountData): Promise<ApiResponse<any>> {
    try {
      // Валидируем данные перед отправкой
      const validatedData = updateAccountSchema.partial().parse(accountData);
      return await api.updateAccount(id, validatedData);
    } catch (error: any) {
      // Возвращаем ошибку валидации
      return { 
        data: null, 
        error: error.message || 'Ошибка валидации данных счёта' 
      };
    }
  }

  // Методы для работы с транзакциями
  async createTransaction(transactionData: CreateTransactionData): Promise<ApiResponse<any>> {
    try {
      // Валидируем данные перед отправкой
      const validatedData = createTransactionSchema.parse(transactionData);
      return await api.createTransaction(validatedData);
    } catch (error: any) {
      // Возвращаем ошибку валидации
      return { 
        data: null, 
        error: error.message || 'Ошибка валидации данных транзакции' 
      };
    }
  }

  // Методы для работы с бюджетами
  async createBudget(budgetData: CreateBudgetData): Promise<ApiResponse<any>> {
    try {
      // Валидируем данные перед отправкой
      const validatedData = createBudgetSchema.parse(budgetData);
      return await api.createBudget(validatedData);
    } catch (error: any) {
      // Возвращаем ошибку валидации
      return { 
        data: null, 
        error: error.message || 'Ошибка валидации данных бюджета' 
      };
    }
  }

  async updateBudget(id: string, budgetData: UpdateBudgetData): Promise<ApiResponse<any>> {
    try {
      // Валидируем данные перед отправкой
      const validatedData = updateBudgetSchema.partial().parse(budgetData);
      return await api.updateBudget(id, validatedData);
    } catch (error: any) {
      // Возвращаем ошибку валидации
      return { 
        data: null, 
        error: error.message || 'Ошибка валидации данных бюджета' 
      };
    }
  }

  // Методы для работы с категориями
  async createCategory(categoryData: CreateCategoryData): Promise<ApiResponse<any>> {
    try {
      // Валидируем данные перед отправкой
      const validatedData = createCategorySchema.parse(categoryData);
      return await api.createCategory(validatedData);
    } catch (error: any) {
      // Возвращаем ошибку валидации
      return { 
        data: null, 
        error: error.message || 'Ошибка валидации данных категории' 
      };
    }
  }

 async updateCategory(id: string, categoryData: UpdateCategoryData): Promise<ApiResponse<any>> {
    try {
      // Валидируем данные перед отправкой
      const validatedData = updateCategorySchema.partial().parse(categoryData);
      return await api.updateCategory(id, validatedData);
    } catch (error: any) {
      // Возвращаем ошибку валидации
      return { 
        data: null, 
        error: error.message || 'Ошибка валидации данных категории' 
      };
    }
  }

  // Методы для работы с долгами
  async createDebt(debtData: CreateDebtData): Promise<ApiResponse<any>> {
    try {
      // Валидируем данные перед отправкой
      const validatedData = createDebtSchema.parse(debtData);
      return await api.createDebt(validatedData);
    } catch (error: any) {
      // Возвращаем ошибку валидации
      return { 
        data: null, 
        error: error.message || 'Ошибка валидации данных долга' 
      };
    }
  }

  async updateDebt(id: string, debtData: UpdateDebtData): Promise<ApiResponse<any>> {
    try {
      // Валидируем данные перед отправкой
      const validatedData = updateDebtSchema.partial().parse(debtData);
      return await api.updateDebt(id, validatedData);
    } catch (error: any) {
      // Возвращаем ошибку валидации
      return { 
        data: null, 
        error: error.message || 'Ошибка валидации данных долга' 
      };
    }
  }

  // Методы для работы с правилами
  async createRule(ruleData: CreateRuleData): Promise<ApiResponse<any>> {
    try {
      // Валидируем данные перед отправкой
      const validatedData = createRuleSchema.parse(ruleData);
      return await api.createRule(validatedData);
    } catch (error: any) {
      // Возвращаем ошибку валидации
      return { 
        data: null, 
        error: error.message || 'Ошибка валидации данных правила' 
      };
    }
  }

  async updateRule(id: string, ruleData: UpdateRuleData): Promise<ApiResponse<any>> {
    try {
      // Валидируем данные перед отправкой
      const validatedData = updateRuleSchema.partial().parse(ruleData);
      return await api.updateRule(id, validatedData);
    } catch (error: any) {
      // Возвращаем ошибку валидации
      return { 
        data: null, 
        error: error.message || 'Ошибка валидации данных правила' 
      };
    }
  }

  // Передаем остальные методы напрямую
  getHouseholds() { return api.getHouseholds(); }
 createHousehold(name: string) { return api.createHousehold(name); }
 getMembers(householdId: string) { return api.getMembers(householdId); }
 getAccounts(householdId: string, includeBalance: boolean = false) { return api.getAccounts(householdId, includeBalance); }
  reorderAccounts(accounts: { id: string; sort_order: number }[]) { return api.reorderAccounts(accounts); }
  getTransactions(filter: any) { return api.getTransactions(filter); }
  createTransfer(transferData: any) { return api.createTransfer(transferData); }
 getBudgets(householdId: string) { return api.getBudgets(householdId); }
  getBudget(id: string) { return api.getBudget(id); }
  computeBudget(budgetId: string, params: any) { return api.computeBudget(budgetId, params); }
  getCategories(householdId: string) { return api.getCategories(householdId); }
  getDebts(householdId: string) { return api.getDebts(householdId); }
  getRules(householdId: string) { return api.getRules(householdId); }
  importTransactions(transactions: any[], importId: string) { return api.importTransactions(transactions, importId); }
  rollbackImport(importId: string) { return api.rollbackImport(importId); }
}

// Экспортируем экземпляр сервиса с валидацией
export const validatedApi = new ValidatedApiService();