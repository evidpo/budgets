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

    // Проверка, нужно ли включать баланс
    const includeBalance = url.searchParams.get('include_balance') === '1';

    // Обработка маршрутов
    if (method === 'GET') {
      // GET /accounts
      if (pathParts.length === 3) { // ['', 'accounts', '']
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'viewer'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        // Получение счетов
        let query = supabase
          .from('accounts')
          .select(`
            id, 
            name, 
            type, 
            currency, 
            opening_balance, 
            is_archived, 
            note, 
            sort_order, 
            created_at, 
            updated_at, 
            version
          `)
          .eq('household_id', householdId)
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true });

        // Добавляем баланс, если запрошено
        if (includeBalance) {
          // Для получения баланса используем RPC функцию
          const { data: accounts, error: accountsError } = await supabase
            .from('accounts')
            .select(`
              id,
              name,
              type,
              currency,
              opening_balance,
              is_archived,
              note,
              sort_order,
              created_at,
              updated_at,
              version
            `)
            .eq('household_id', householdId)
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true });

          if (accountsError) {
            throw accountsError;
          }

          // Затем для каждого счета получим баланс с помощью RPC функции
          const accountsWithBalances = [];
          for (const account of accounts) {
            const { data: balanceData, error: balanceError } = await supabase
              .rpc('calculate_account_balance', { p_account_id: account.id });
            
            if (balanceError) {
              console.error(`Error calculating balance for account ${account.id}:`, balanceError);
              accountsWithBalances.push({
                ...account,
                balance: account.opening_balance
              });
            } else {
              accountsWithBalances.push({
                ...account,
                balance: balanceData?.[0] || account.opening_balance
              });
            }
          }

          return jsonResponse(accountsWithBalances);
        } else {
          // Просто возвращаем счета без баланса
          const { data, error } = await supabase
            .from('accounts')
            .select(`
              id,
              name,
              type,
              currency,
              opening_balance,
              is_archived,
              note,
              sort_order,
              created_at,
              updated_at,
              version
            `)
            .eq('household_id', householdId)
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true });

          if (error) {
            throw error;
          }
          return jsonResponse(data);
        }
      }
    } else if (method === 'POST') {
      // POST /accounts
      if (pathParts.length === 3) { // ['', 'accounts', '']
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'editor'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        const body = await req.json();
        
        // Валидация данных с использованием схемы
        const validation = validateData(body, validationSchemas.account);
        if (!validation.isValid) {
          return errorResponse('Validation failed', 400, validation.errors.join(', '));
        }

        // Создание счета
        const { data, error } = await supabase
          .from('accounts')
          .insert([{
            ...body,
            household_id: householdId,
            user_id: userId
          }])
          .select()
          .single();

        if (error) {
          throw error;
        }

        return jsonResponse(data, 201);
      }
    } else if (method === 'PATCH') {
      // PATCH /accounts/reorder
      if (pathParts.length === 4 && pathParts[3] === 'reorder') {
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'editor'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        const body = await req.json();
        
        if (!Array.isArray(body)) {
          return errorResponse('Request body must be an array of account reorderings', 40);
        }

        // Валидация и обновление порядка
        const updates = [];
        for (const item of body) {
          // Валидация каждого элемента массива
          if (!item.id) {
            return errorResponse('Each item must have an id', 400);
          }
          
          if (typeof item.sort_order !== 'number') {
            return errorResponse('Each item must have a numeric sort_order', 400);
          }
          
          // Проверка формата UUID
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)) {
            return errorResponse(`Invalid UUID format for account ${item.id}`, 400);
          }
          
          // Проверка принадлежности счета к household
          const hasAccess = await checkResourceAccess(userId, 'accounts', item.id, householdId);
          if (!hasAccess) {
            return errorResponse(`Account ${item.id} not found or access denied`, 403);
          }
          
          updates.push({ id: item.id, sort_order: item.sort_order });
        }

        // Обновление порядка счетов
        for (const update of updates) {
          const { error } = await supabase
            .from('accounts')
            .update({ sort_order: update.sort_order })
            .eq('id', update.id)
            .eq('household_id', householdId);

          if (error) {
            throw error;
          }
        }

        return jsonResponse({ message: 'Accounts reordered successfully' });
      } 
      // PATCH /accounts/:id
      else if (pathParts.length === 4) {
        const accountId = pathParts[3];
        
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'editor'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        // Проверка принадлежности счета к household
        const hasAccess = await checkResourceAccess(userId, 'accounts', accountId, householdId);
        if (!hasAccess) {
          return errorResponse(`Account ${accountId} not found or access denied`, 404);
        }

        const body = await req.json();
        
        // Валидация данных с использованием схемы (проверяем только те поля, что присутствуют в запросе)
        const updateData = { ...body };
        const validation = validateData(updateData, validationSchemas.account);
        if (!validation.isValid) {
          return errorResponse('Validation failed', 400, validation.errors.join(', '));
        }
        
        // Обновление счета
        const { data, error } = await supabase
          .from('accounts')
          .update(updateData)
          .eq('id', accountId)
          .eq('household_id', householdId)
          .select()
          .single();

        if (error) {
          throw error;
        }

        return jsonResponse(data);
      }
    } else if (method === 'DELETE') {
      // DELETE /accounts/:id
      if (pathParts.length === 4) {
        const accountId = pathParts[3];
        
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'editor'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        // Проверка принадлежности счета к household
        const hasAccess = await checkResourceAccess(userId, 'accounts', accountId, householdId);
        if (!hasAccess) {
          return errorResponse(`Account ${accountId} not found or access denied`, 404);
        }

        // Удаление счета
        const { error } = await supabase
          .from('accounts')
          .delete()
          .eq('id', accountId)
          .eq('household_id', householdId);

        if (error) {
          throw error;
        }

        return jsonResponse({ message: 'Account deleted successfully' });
      }
    }

    // Если маршрут не найден
    return errorResponse('Route not found', 404);
  } catch (error) {
    console.error('Error in accounts API:', error);
    return errorResponse('Internal server error', 500, error.message);
  }
});