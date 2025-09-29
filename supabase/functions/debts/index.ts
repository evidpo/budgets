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
      // GET /debts
      if (pathParts.length === 3) { // ['', 'debts', '']
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'viewer'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        // Получение параметров фильтрации
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = (page - 1) * limit;

        // Получение долгов
        const { data, error, count } = await supabase
          .from('debts')
          .select(`
            id, 
            name, 
            counterparty, 
            amount, 
            opening_balance, 
            interest_rate, 
            minimum_payment, 
            start_date, 
            end_date, 
            note, 
            created_at, 
            updated_at, 
            version
          `)
          .eq('household_id', householdId)
          .order('name', { ascending: true })
          .range(offset, offset + limit - 1);

        if (error) {
          throw error;
        }

        // Добавляем остаток по каждому долгу
        const debtsWithBalances = [];
        for (const debt of data) {
          const { data: balanceData, error: balanceError } = await supabase
            .rpc('calculate_debt_balance', { debt_id: debt.id });
          
          if (balanceError) {
            console.error(`Error calculating balance for debt ${debt.id}:`, balanceError);
            debtsWithBalances.push({
              ...debt,
              balance: debt.opening_balance
            });
          } else {
            debtsWithBalances.push({
              ...debt,
              balance: balanceData?.[0]?.calculate_debt_balance || debt.opening_balance
            });
          }
        }

        // Возвращаем данные с метаинформацией о пагинации
        return jsonResponse({
          data: debtsWithBalances,
          pagination: {
            page,
            limit,
            count: count || 0,
            has_more: (offset + limit) < (count || 0)
          }
        });
      }
    } else if (method === 'POST') {
      // POST /debts
      if (pathParts.length === 3) { // ['', 'debts', '']
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'editor'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        const body = await req.json();
        
        // Валидация данных с использованием схемы
        const validation = validateData(body, validationSchemas.debt);
        if (!validation.isValid) {
          return errorResponse('Validation failed', 400, validation.errors.join(', '));
        }

        // Создание долга
        const { data, error } = await supabase
          .from('debts')
          .insert([{
            ...body,
            household_id: householdId
          }])
          .select()
          .single();

        if (error) {
          throw error;
        }

        // Добавляем остаток к созданному долгу
        const { data: balanceData, error: balanceError } = await supabase
          .rpc('calculate_debt_balance', { debt_id: data.id });
        
        if (balanceError) {
          console.error(`Error calculating balance for debt ${data.id}:`, balanceError);
          data.balance = data.opening_balance;
        } else {
          data.balance = balanceData?.[0]?.calculate_debt_balance || data.opening_balance;
        }

        return jsonResponse(data, 201);
      }
    } else if (method === 'PATCH') {
      // PATCH /debts/:id
      if (pathParts.length === 4) {
        const debtId = pathParts[3];
        
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'editor'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        // Проверка принадлежности долга к household
        const hasAccess = await checkResourceAccess(userId, 'debts', debtId, householdId);
        if (!hasAccess) {
          return errorResponse(`Debt ${debtId} not found or access denied`, 404);
        }

        const body = await req.json();
        
        // Валидация данных с использованием схемы (проверяем только те поля, что присутствуют в запросе)
        const updateData = { ...body };
        const validation = validateData(updateData, validationSchemas.debt);
        if (!validation.isValid) {
          return errorResponse('Validation failed', 400, validation.errors.join(', '));
        }

        // Обновление долга
        const { data, error } = await supabase
          .from('debts')
          .update(body)
          .eq('id', debtId)
          .eq('household_id', householdId)
          .select()
          .single();

        if (error) {
          throw error;
        }

        // Добавляем остаток к обновленному долгу
        const { data: balanceData, error: balanceError } = await supabase
          .rpc('calculate_debt_balance', { debt_id: data.id });
        
        if (balanceError) {
          console.error(`Error calculating balance for debt ${data.id}:`, balanceError);
          data.balance = data.opening_balance;
        } else {
          data.balance = balanceData?.[0]?.calculate_debt_balance || data.opening_balance;
        }

        return jsonResponse(data);
      }
    } else if (method === 'DELETE') {
      // DELETE /debts/:id
      if (pathParts.length === 4) {
        const debtId = pathParts[3];
        
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'editor'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        // Проверка принадлежности долга к household
        const hasAccess = await checkResourceAccess(userId, 'debts', debtId, householdId);
        if (!hasAccess) {
          return errorResponse(`Debt ${debtId} not found or access denied`, 404);
        }

        // Удаление долга
        const { error } = await supabase
          .from('debts')
          .delete()
          .eq('id', debtId)
          .eq('household_id', householdId);

        if (error) {
          throw error;
        }

        return jsonResponse({ message: 'Debt deleted successfully' });
      }
    }

    // Если маршрут не найден
    return errorResponse('Route not found', 404);
  } catch (error) {
    console.error('Error in debts API:', error);
    return errorResponse('Internal server error', 500, error.message);
  }
});