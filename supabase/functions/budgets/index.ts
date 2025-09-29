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
import { validateData, validationSchemas } from '../_shared/validation.ts';

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

    // Обработка маршрутов
    if (method === 'GET') {
      // GET /budgets
      if (pathParts.length === 3) { // ['', 'budgets', '']
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'viewer'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        // Получение параметров фильтрации
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = (page - 1) * limit;

        // Получение бюджетов
        const { data, error, count } = await supabase
          .from('budgets')
          .select(`
            id, 
            name, 
            category_id, 
            amount, 
            period, 
            start_date, 
            end_date, 
            direction, 
            rollover, 
            include_subtree, 
            sort_order, 
            created_at, 
            updated_at, 
            version,
            categories (name, type)
          `)
          .eq('household_id', householdId)
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true })
          .range(offset, offset + limit - 1);

        if (error) {
          throw error;
        }

        // Возвращаем данные с метаинформацией о пагинации
        return jsonResponse({
          data,
          pagination: {
            page,
            limit,
            count: count || 0,
            has_more: (offset + limit) < (count || 0)
          }
        });
      }
      // GET /budgets/:id/compute
      else if (pathParts.length === 5 && pathParts[4] === 'compute') {
        const budgetId = pathParts[3];
        
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'viewer'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        // Проверка принадлежности бюджета к household
        const hasAccess = await checkResourceAccess(userId, 'budgets', budgetId, householdId);
        if (!hasAccess) {
          return errorResponse(`Budget ${budgetId} not found or access denied`, 404);
        }

        // Получение даты для вычисления (по умолчанию - сегодня)
        const asOf = url.searchParams.get('as_of') || new Date().toISOString().split('T')[0];

        // Получение информации о бюджете
        const { data: budget, error: budgetError } = await supabase
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
          .eq('id', budgetId)
          .eq('household_id', householdId)
          .single();

        if (budgetError) {
          throw budgetError;
        }

        // Вычисление потраченной/полученной суммы по бюджету
        // Сначала получаем фильтры бюджета (счета и категории)
        const { data: budgetAccounts } = await supabase
          .from('budget_accounts')
          .select('account_id')
          .eq('budget_id', budgetId);

        const { data: budgetCategories } = await supabase
          .from('budget_categories')
          .select('category_id')
          .eq('budget_id', budgetId);

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

        return jsonResponse({
          budget_id: budgetId,
          as_of: asOf,
          spent,
          available,
          limit: budget.amount,
          direction: budget.direction
        });
      }
    } else if (method === 'POST') {
      // POST /budgets
      if (pathParts.length === 3) { // ['', 'budgets', '']
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'editor'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        const body = await req.json();
        
        // Валидация данных с использованием схемы
        const validation = validateData(body, validationSchemas.budget);
        if (!validation.isValid) {
          return errorResponse('Validation failed', 400, validation.errors.join(', '));
        }

        // Проверка категории, если указана
        if (body.category_id) {
          const hasCategoryAccess = await checkResourceAccess(userId, 'categories', body.category_id, householdId);
          if (!hasCategoryAccess) {
            return errorResponse(`Category ${body.category_id} not found or access denied`, 403);
          }
        }

        // Создание бюджета
        const { data, error } = await supabase
          .from('budgets')
          .insert([{
            ...body,
            household_id: householdId
          }])
          .select()
          .single();

        if (error) {
          throw error;
        }

        // Если указаны фильтры по категориям или счетам, создаем связи
        if (body.category_ids && Array.isArray(body.category_ids)) {
          const budgetCategoryMappings = body.category_ids.map((categoryId: string) => ({
            budget_id: data.id,
            category_id: categoryId
          }));
          
          if (budgetCategoryMappings.length > 0) {
            const { error: categoryError } = await supabase
              .from('budget_categories')
              .insert(budgetCategoryMappings);
              
            if (categoryError) {
              console.error('Error creating budget-category mappings:', categoryError);
              // Не отменяем создание бюджета, если ошибка при создании связей
            }
          }
        }
        
        if (body.account_ids && Array.isArray(body.account_ids)) {
          const budgetAccountMappings = body.account_ids.map((accountId: string) => ({
            budget_id: data.id,
            account_id: accountId
          }));
          
          if (budgetAccountMappings.length > 0) {
            const { error: accountError } = await supabase
              .from('budget_accounts')
              .insert(budgetAccountMappings);
              
            if (accountError) {
              console.error('Error creating budget-account mappings:', accountError);
              // Не отменяем создание бюджета, если ошибка при создании связей
            }
          }
        }

        return jsonResponse(data, 201);
      }
    } else if (method === 'PATCH') {
      // PATCH /budgets/:id
      if (pathParts.length === 4) {
        const budgetId = pathParts[3];
        
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'editor'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        // Проверка принадлежности бюджета к household
        const hasAccess = await checkResourceAccess(userId, 'budgets', budgetId, householdId);
        if (!hasAccess) {
          return errorResponse(`Budget ${budgetId} not found or access denied`, 404);
        }

        const body = await req.json();
        
        // Валидация данных с использованием схемы (проверяем только те поля, что присутствуют в запросе)
        const updateData = { ...body };
        const validation = validateData(updateData, validationSchemas.budget);
        if (!validation.isValid) {
          return errorResponse('Validation failed', 400, validation.errors.join(', '));
        }
        
        // Обновление бюджета
        const { data, error } = await supabase
          .from('budgets')
          .update(updateData)
          .eq('id', budgetId)
          .eq('household_id', householdId)
          .select()
          .single();

        if (error) {
          throw error;
        }

        // Обновляем связи с категориями и счетами, если они указаны
        if (body.category_ids && Array.isArray(body.category_ids)) {
          // Сначала удаляем старые связи
          await supabase
            .from('budget_categories')
            .delete()
            .eq('budget_id', budgetId);
            
          // Затем создаем новые
          const budgetCategoryMappings = body.category_ids.map((categoryId: string) => ({
            budget_id: budgetId,
            category_id: categoryId
          }));
          
          if (budgetCategoryMappings.length > 0) {
            const { error: categoryError } = await supabase
              .from('budget_categories')
              .insert(budgetCategoryMappings);
              
            if (categoryError) {
              console.error('Error updating budget-category mappings:', categoryError);
            }
          }
        }
        
        if (body.account_ids && Array.isArray(body.account_ids)) {
          // Сначала удаляем старые связи
          await supabase
            .from('budget_accounts')
            .delete()
            .eq('budget_id', budgetId);
            
          // Затем создаем новые
          const budgetAccountMappings = body.account_ids.map((accountId: string) => ({
            budget_id: budgetId,
            account_id: accountId
          }));
          
          if (budgetAccountMappings.length > 0) {
            const { error: accountError } = await supabase
              .from('budget_accounts')
              .insert(budgetAccountMappings);
              
            if (accountError) {
              console.error('Error updating budget-account mappings:', accountError);
            }
          }
        }

        return jsonResponse(data);
      }
    } else if (method === 'DELETE') {
      // DELETE /budgets/:id
      if (pathParts.length === 4) {
        const budgetId = pathParts[3];
        
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'editor'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        // Проверка принадлежности бюджета к household
        const hasAccess = await checkResourceAccess(userId, 'budgets', budgetId, householdId);
        if (!hasAccess) {
          return errorResponse(`Budget ${budgetId} not found or access denied`, 404);
        }

        // Удаление бюджета (связи удалятся каскадно или через триггер)
        const { error } = await supabase
          .from('budgets')
          .delete()
          .eq('id', budgetId)
          .eq('household_id', householdId);

        if (error) {
          throw error;
        }

        return jsonResponse({ message: 'Budget deleted successfully' });
      }
    }

    // Если маршрут не найден
    return errorResponse('Route not found', 404);
  } catch (error) {
    console.error('Error in budgets API:', error);
    return errorResponse('Internal server error', 500, error.message);
  }
});