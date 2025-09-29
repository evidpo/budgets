// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import {
  jsonResponse,
  errorResponse,
  extractToken,
  getUserHousehold,
  checkResourceAccess,
  getUserRole,
  hasAccess,
 supabase
} from '../_shared/utils.ts';
import { validateQueryParams } from '../_shared/validation.ts';

serve(async (req) => {
  // Обработка CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Client-Info',
      }
    });
  }

  try {
    // Извлечение токена и информации о пользователе
    const token = extractToken(req);
    if (!token) {
      return errorResponse('Authorization token required', 401);
    }

    const userHousehold = await getUserHousehold(token);
    if (!userHousehold) {
      return errorResponse('Invalid or expired token', 401);
    }

    const { userId, householdId } = userHousehold;
    const userRole = await getUserRole(userId, householdId);
    if (!userRole) {
      return errorResponse('User not found in household', 403);
    }

    // Разбор URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const method = req.method;

    // Проверка прав доступа (для отчетов нужен хотя бы viewer)
    if (!(await hasAccess(userRole, 'viewer'))) {
      return errorResponse('Insufficient permissions', 403);
    }

    // Обработка маршрутов для отчетов
    if (method === 'GET') {
      // GET /reports/overall-balance
      if (pathParts.length === 4 && pathParts[3] === 'overall-balance') {
        // Проверка параметров запроса
        const allowedParams = ['include_archived'];
        const paramValidation = validateQueryParams(url.searchParams, allowedParams);
        if (!paramValidation.isValid) {
          return errorResponse('Invalid query parameters', 400, paramValidation.errors.join(', '));
        }
        
        const includeArchived = url.searchParams.get('include_archived') === 'true';

        // Получаем все счета
        let accountsQuery = supabase
          .from('accounts')
          .select(`
            id, 
            name, 
            type, 
            currency, 
            opening_balance
          `)
          .eq('household_id', householdId);

        if (!includeArchived) {
          accountsQuery = accountsQuery.eq('is_archived', false);
        }

        const { data: accounts, error: accountsError } = await accountsQuery;
        if (accountsError) {
          throw accountsError;
        }

        // Для каждого счета вычисляем баланс
        const accountsWithBalances = [];
        let totalBalance = 0;

        for (const account of accounts) {
          const { data: balanceData, error: balanceError } = await supabase
            .rpc('calculate_account_balance', { account_id: account.id });
          
          if (balanceError) {
            console.error(`Error calculating balance for account ${account.id}:`, balanceError);
            const balance = account.opening_balance;
            accountsWithBalances.push({
              ...account,
              balance
            });
            totalBalance += balance;
          } else {
            const balance = balanceData?.[0]?.calculate_account_balance || account.opening_balance;
            accountsWithBalances.push({
              ...account,
              balance
            });
            totalBalance += balance;
          }
        }

        return jsonResponse({
          accounts: accountsWithBalances,
          total: totalBalance
        });
      }
      // GET /reports/overall-movement
      else if (pathParts.length === 4 && pathParts[3] === 'overall-movement') {
        // Проверка параметров запроса
        const allowedParams = ['from', 'to', 'exclude_transfers'];
        const paramValidation = validateQueryParams(url.searchParams, allowedParams);
        if (!paramValidation.isValid) {
          return errorResponse('Invalid query parameters', 400, paramValidation.errors.join(', '));
        }
        
        const fromDate = url.searchParams.get('from');
        const toDate = url.searchParams.get('to');
        const excludeTransfers = url.searchParams.get('exclude_transfers') === 'true';

        // Получаем транзакции за период
        let transactionsQuery = supabase
          .from('transactions')
          .select(`
            account_id,
            amount,
            date
          `)
          .eq('household_id', householdId);

        if (fromDate) {
          transactionsQuery = transactionsQuery.gte('date', fromDate);
        }
        
        if (toDate) {
          transactionsQuery = transactionsQuery.lte('date', toDate);
        }
        
        if (excludeTransfers) {
          transactionsQuery = transactionsQuery.is('transfer_id', null);
        }

        const { data: transactions, error: transactionsError } = await transactionsQuery;
        if (transactionsError) {
          throw transactionsError;
        }

        // Группируем транзакции по счетам
        const accountMovements: Record<string, { 
          account_id: string; 
          deposits: number; 
          withdrawals: number; 
          net: number 
        }> = {};

        // Получаем все счета для определения начальных балансов
        const { data: accounts, error: accountsError } = await supabase
          .from('accounts')
          .select('id, opening_balance')
          .eq('household_id', householdId);
          
        if (accountsError) {
          throw accountsError;
        }

        // Инициализируем данные для каждого счета
        accounts.forEach(account => {
          if (!accountMovements[account.id]) {
            accountMovements[account.id] = {
              account_id: account.id,
              deposits: 0,
              withdrawals: 0,
              net: 0
            };
          }
        });

        // Обрабатываем транзакции
        transactions.forEach(tx => {
          if (!accountMovements[tx.account_id]) {
            accountMovements[tx.account_id] = {
              account_id: tx.account_id,
              deposits: 0,
              withdrawals: 0,
              net: 0
            };
          }

          if (tx.amount > 0) {
            // Доход
            accountMovements[tx.account_id].deposits += tx.amount;
            accountMovements[tx.account_id].net += tx.amount;
          } else {
            // Расход
            accountMovements[tx.account_id].withdrawals += Math.abs(tx.amount);
            accountMovements[tx.account_id].net += tx.amount;
          }
        });

        // Вычисляем балансы на начало и конец периода
        const accountBalances = [];
        for (const accountId in accountMovements) {
          // Получаем начальный баланс
          const account = accounts.find(acc => acc.id === accountId);
          const openingBalance = account ? account.opening_balance : 0;
          const beginningBalance = openingBalance;
          const endingBalance = openingBalance + accountMovements[accountId].net;

          // Получаем название счета
          const { data: accountData, error: accountError } = await supabase
            .from('accounts')
            .select('name, type, currency')
            .eq('id', accountId)
            .single();
            
          if (!accountError && accountData) {
            accountBalances.push({
              account_id: accountId,
              account_name: accountData.name,
              account_type: accountData.type,
              currency: accountData.currency,
              beginning_balance: beginningBalance,
              deposits: accountMovements[accountId].deposits,
              withdrawals: accountMovements[accountId].withdrawals,
              net: accountMovements[accountId].net,
              ending_balance: endingBalance
            });
          }
        }

        return jsonResponse({
          accounts: accountBalances,
          total: {
            deposits: Object.values(accountMovements).reduce((sum, acc) => sum + acc.deposits, 0),
            withdrawals: Object.values(accountMovements).reduce((sum, acc) => sum + acc.withdrawals, 0),
            net: Object.values(accountMovements).reduce((sum, acc) => sum + acc.net, 0)
          }
        });
      }
      // GET /reports/by-budgets
      else if (pathParts.length === 4 && pathParts[3] === 'by-budgets') {
        // Проверка параметров запроса
        const allowedParams = ['as_of'];
        const paramValidation = validateQueryParams(url.searchParams, allowedParams);
        if (!paramValidation.isValid) {
          return errorResponse('Invalid query parameters', 400, paramValidation.errors.join(', '));
        }
        
        const asOf = url.searchParams.get('as_of') || new Date().toISOString().split('T')[0];

        // Получаем все бюджеты
        const { data: budgets, error: budgetsError } = await supabase
          .from('budgets')
          .select(`
            id, 
            name, 
            amount, 
            period, 
            start_date, 
            end_date, 
            direction, 
            rollover, 
            include_subtree
          `)
          .eq('household_id', householdId);

        if (budgetsError) {
          throw budgetsError;
        }

        const budgetsReport = [];

        for (const budget of budgets) {
          // Вычисляем потраченную/полученную сумму по бюджету
          // Сначала получаем фильтры бюджета (счета и категории)
          const { data: budgetAccounts } = await supabase
            .from('budget_accounts')
            .select('account_id')
            .eq('budget_id', budget.id);

          const { data: budgetCategories } = await supabase
            .from('budget_categories')
            .select('category_id')
            .eq('budget_id', budget.id);

          // Формируем запрос к транзакциям
          let transactionsQuery = supabase
            .from('transactions')
            .select('amount')
            .eq('household_id', householdId)
            .gte('date', budget.start_date)
            .lte('date', asOf)
            .is('transfer_id', null); // Исключаем переводы

          // Применяем фильтры по счетам
          if (budgetAccounts && budgetAccounts.length > 0) {
            const accountIds = budgetAccounts.map(acc => acc.account_id);
            transactionsQuery = transactionsQuery.in('account_id', accountIds);
          }

          // Применяем фильтры по категориям
          if (budgetCategories && budgetCategories.length > 0) {
            const categoryIds = budgetCategories.map(cat => cat.category_id);
            transactionsQuery = transactionsQuery.in('category_id', categoryIds);
          }

          const { data: transactions, error: transactionsError } = await transactionsQuery;
          if (transactionsError) {
            throw transactionsError;
          }

          // Вычисляем потраченную/полученную сумму в зависимости от направления бюджета
          let spent = 0;
          if (budget.direction === 'expense') {
            // Для расходов учитываем только отрицательные транзакции (расходы)
            spent = transactions
              .filter(tx => tx.amount < 0)
              .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
          } else if (budget.direction === 'income') {
            // Для доходов учитываем только положительные транзакции (доходы)
            spent = transactions
              .filter(tx => tx.amount > 0)
              .reduce((sum, tx) => sum + tx.amount, 0);
          }

          // Вычисляем доступную сумму
          const available = budget.amount - spent;

          budgetsReport.push({
            budget_id: budget.id,
            budget_name: budget.name,
            period: budget.period,
            limit: budget.amount,
            spent,
            available,
            direction: budget.direction
          });
        }

        return jsonResponse(budgetsReport);
      }
      // GET /reports/by-accounts
      else if (pathParts.length === 4 && pathParts[3] === 'by-accounts') {
        // Проверка параметров запроса
        const allowedParams = ['from', 'to', 'exclude_transfers'];
        const paramValidation = validateQueryParams(url.searchParams, allowedParams);
        if (!paramValidation.isValid) {
          return errorResponse('Invalid query parameters', 400, paramValidation.errors.join(', '));
        }
        
        const fromDate = url.searchParams.get('from');
        const toDate = url.searchParams.get('to');
        const excludeTransfers = url.searchParams.get('exclude_transfers') === 'true';

        // Получаем все счета
        const { data: accounts, error: accountsError } = await supabase
          .from('accounts')
          .select('id, name, type, currency')
          .eq('household_id', householdId);

        if (accountsError) {
          throw accountsError;
        }

        // Получаем транзакции за период
        let transactionsQuery = supabase
          .from('transactions')
          .select(`
            account_id,
            amount
          `)
          .eq('household_id', householdId);

        if (fromDate) {
          transactionsQuery = transactionsQuery.gte('date', fromDate);
        }
        
        if (toDate) {
          transactionsQuery = transactionsQuery.lte('date', toDate);
        }
        
        if (excludeTransfers) {
          transactionsQuery = transactionsQuery.is('transfer_id', null);
        }

        const { data: transactions, error: transactionsError } = await transactionsQuery;
        if (transactionsError) {
          throw transactionsError;
        }

        // Группируем транзакции по счетам
        const accountMovements: Record<string, { 
          account_id: string; 
          deposits: number; 
          withdrawals: number; 
          net: number 
        }> = {};

        // Инициализируем данные для каждого счета
        accounts.forEach(account => {
          if (!accountMovements[account.id]) {
            accountMovements[account.id] = {
              account_id: account.id,
              deposits: 0,
              withdrawals: 0,
              net: 0
            };
          }
        });

        // Обрабатываем транзакции
        transactions.forEach(tx => {
          if (!accountMovements[tx.account_id]) {
            accountMovements[tx.account_id] = {
              account_id: tx.account_id,
              deposits: 0,
              withdrawals: 0,
              net: 0
            };
          }

          if (tx.amount > 0) {
            // Доход
            accountMovements[tx.account_id].deposits += tx.amount;
            accountMovements[tx.account_id].net += tx.amount;
          } else {
            // Расход
            accountMovements[tx.account_id].withdrawals += Math.abs(tx.amount);
            accountMovements[tx.account_id].net += tx.amount;
          }
        });

        // Формируем отчет
        const accountReports = [];
        for (const accountId in accountMovements) {
          const account = accounts.find(acc => acc.id === accountId);
          if (account) {
            accountReports.push({
              account_id: accountId,
              account_name: account.name,
              account_type: account.type,
              currency: account.currency,
              deposits: accountMovements[accountId].deposits,
              withdrawals: accountMovements[accountId].withdrawals,
              net: accountMovements[accountId].net
            });
          }
        }

        return jsonResponse(accountReports);
      }
      // GET /reports/income-by-category
      else if (pathParts.length === 4 && pathParts[3] === 'income-by-category') {
        // Проверка параметров запроса
        const allowedParams = ['from', 'to', 'group_root'];
        const paramValidation = validateQueryParams(url.searchParams, allowedParams);
        if (!paramValidation.isValid) {
          return errorResponse('Invalid query parameters', 400, paramValidation.errors.join(', '));
        }
        
        const fromDate = url.searchParams.get('from');
        const toDate = url.searchParams.get('to');
        const groupRoot = url.searchParams.get('group_root') === 'true';

        // Получаем транзакции доходов за период
        let transactionsQuery = supabase
          .from('transactions')
          .select(`
            category_id,
            amount,
            categories (name, path)
          `)
          .eq('household_id', householdId)
          .gt('amount', 0) // Только доходы
          .is('transfer_id', null); // Исключаем переводы

        if (fromDate) {
          transactionsQuery = transactionsQuery.gte('date', fromDate);
        }
        
        if (toDate) {
          transactionsQuery = transactionsQuery.lte('date', toDate);
        }

        const { data: transactions, error: transactionsError } = await transactionsQuery;
        if (transactionsError) {
          throw transactionsError;
        }

        // Группируем по категориям
        const categoryTotals: Record<string, { 
          category_id: string; 
          category_name: string; 
          path: string; 
          total: number 
        }> = {};

        transactions.forEach(tx => {
          if (tx.category_id) {
            if (!categoryTotals[tx.category_id]) {
              categoryTotals[tx.category_id] = {
                category_id: tx.category_id,
                category_name: tx.categories?.name || 'Unknown',
                path: tx.categories?.path || 'Unknown',
                total: 0
              };
            }
            categoryTotals[tx.category_id].total += tx.amount;
          }
        });

        let result = Object.values(categoryTotals);

        // Если нужно группировать по корню, объединяем категории
        if (groupRoot) {
          const rootCategoryTotals: Record<string, { 
            category_name: string; 
            total: number 
          }> = {};
          
          result.forEach(item => {
            const rootName = item.path.split(':')[0] || item.category_name;
            if (!rootCategoryTotals[rootName]) {
              rootCategoryTotals[rootName] = {
                category_name: rootName,
                total: 0
              };
            }
            rootCategoryTotals[rootName].total += item.total;
          });
          
          result = Object.values(rootCategoryTotals).map(item => ({
            category_name: item.category_name,
            total: item.total
          }));
        } else {
          // Сортируем по убыванию суммы
          result.sort((a, b) => b.total - a.total);
        }

        return jsonResponse(result);
      }
      // GET /reports/expense-by-category
      else if (pathParts.length === 4 && pathParts[3] === 'expense-by-category') {
        // Проверка параметров запроса
        const allowedParams = ['from', 'to', 'group_root'];
        const paramValidation = validateQueryParams(url.searchParams, allowedParams);
        if (!paramValidation.isValid) {
          return errorResponse('Invalid query parameters', 400, paramValidation.errors.join(', '));
        }
        
        const fromDate = url.searchParams.get('from');
        const toDate = url.searchParams.get('to');
        const groupRoot = url.searchParams.get('group_root') === 'true';

        // Получаем транзакции расходов за период
        let transactionsQuery = supabase
          .from('transactions')
          .select(`
            category_id,
            amount,
            categories (name, path)
          `)
          .eq('household_id', householdId)
          .lt('amount', 0) // Только расходы
          .is('transfer_id', null); // Исключаем переводы

        if (fromDate) {
          transactionsQuery = transactionsQuery.gte('date', fromDate);
        }
        
        if (toDate) {
          transactionsQuery = transactionsQuery.lte('date', toDate);
        }

        const { data: transactions, error: transactionsError } = await transactionsQuery;
        if (transactionsError) {
          throw transactionsError;
        }

        // Группируем по категориям (используем абсолютное значение для расходов)
        const categoryTotals: Record<string, { 
          category_id: string; 
          category_name: string; 
          path: string; 
          total: number 
        }> = {};

        transactions.forEach(tx => {
          if (tx.category_id) {
            if (!categoryTotals[tx.category_id]) {
              categoryTotals[tx.category_id] = {
                category_id: tx.category_id,
                category_name: tx.categories?.name || 'Unknown',
                path: tx.categories?.path || 'Unknown',
                total: 0
              };
            }
            categoryTotals[tx.category_id].total += Math.abs(tx.amount); // Используем абсолютное значение
          }
        });

        let result = Object.values(categoryTotals);

        // Если нужно группировать по корню, объединяем категории
        if (groupRoot) {
          const rootCategoryTotals: Record<string, { 
            category_name: string; 
            total: number 
          }> = {};
          
          result.forEach(item => {
            const rootName = item.path.split(':')[0] || item.category_name;
            if (!rootCategoryTotals[rootName]) {
              rootCategoryTotals[rootName] = {
                category_name: rootName,
                total: 0
              };
            }
            rootCategoryTotals[rootName].total += item.total;
          });
          
          result = Object.values(rootCategoryTotals).map(item => ({
            category_name: item.category_name,
            total: item.total
          }));
        } else {
          // Сортируем по убыванию суммы
          result.sort((a, b) => b.total - a.total);
        }

        return jsonResponse(result);
      }
    }

    // Если маршрут не найден
    return errorResponse('Route not found', 404);
  } catch (error) {
    console.error('Error in reports API:', error);
    return errorResponse('Internal server error', 500, error.message);
  }
});