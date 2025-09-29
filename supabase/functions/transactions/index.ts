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
      // GET /transactions
      if (pathParts.length === 3) { // ['', 'transactions', '']
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'viewer'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        // Получение параметров фильтрации
        const accountId = url.searchParams.get('account_id');
        const categoryId = url.searchParams.get('category_id');
        const startDate = url.searchParams.get('start_date');
        const endDate = url.searchParams.get('end_date');
        const memberId = url.searchParams.get('member_id');
        const debtId = url.searchParams.get('debt_id');
        const excludeTransfers = url.searchParams.get('exclude_transfers') === 'true';
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = (page - 1) * limit;

        // Построение запроса
        let query = supabase
          .from('transactions')
          .select(`
            id, 
            household_id, 
            user_id, 
            account_id, 
            category_id, 
            description, 
            amount, 
            type, 
            date, 
            payee, 
            note, 
            debt_id, 
            transfer_id, 
            member_id, 
            created_at, 
            updated_at, 
            version,
            accounts (name, type),
            categories (name, type),
            debts (name),
            members (user_id)
          `)
          .eq('household_id', householdId)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        // Применение фильтров
        if (accountId) {
          query = query.eq('account_id', accountId);
        }
        
        if (categoryId) {
          query = query.eq('category_id', categoryId);
        }
        
        if (startDate) {
          query = query.gte('date', startDate);
        }
        
        if (endDate) {
          query = query.lte('date', endDate);
        }
        
        if (memberId) {
          query = query.eq('member_id', memberId);
        }
        
        if (debtId) {
          query = query.eq('debt_id', debtId);
        }
        
        if (excludeTransfers) {
          query = query.is('transfer_id', null);
        }

        const { data, error, count } = await query;
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
    } else if (method === 'POST') {
      // POST /transactions (доход/расход)
      if (pathParts.length === 3) { // ['', 'transactions', '']
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'editor'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        const body = await req.json();
        
        // Валидация данных с использованием схемы
        const validation = validateData(body, validationSchemas.transaction);
        if (!validation.isValid) {
          return errorResponse('Validation failed', 400, validation.errors.join(', '));
        }
        
        // Дополнительная проверка, что amount не равен нулю
        if (body.amount === 0) {
          return errorResponse('Amount cannot be zero', 400);
        }

        // Проверка принадлежности счета к household
        const hasAccountAccess = await checkResourceAccess(userId, 'accounts', body.account_id, householdId);
        if (!hasAccountAccess) {
          return errorResponse(`Account ${body.account_id} not found or access denied`, 403);
        }

        // Проверка категории, если указана
        if (body.category_id) {
          const hasCategoryAccess = await checkResourceAccess(userId, 'categories', body.category_id, householdId);
          if (!hasCategoryAccess) {
            return errorResponse(`Category ${body.category_id} not found or access denied`, 403);
          }
        }

        // Проверка участника, если указан
        if (body.member_id) {
          const hasMemberAccess = await checkResourceAccess(userId, 'members', body.member_id, householdId);
          if (!hasMemberAccess) {
            return errorResponse(`Member ${body.member_id} not found or access denied`, 403);
          }
        }

        // Проверка долга, если указан
        if (body.debt_id) {
          const hasDebtAccess = await checkResourceAccess(userId, 'debts', body.debt_id, householdId);
          if (!hasDebtAccess) {
            return errorResponse(`Debt ${body.debt_id} not found or access denied`, 403);
          }
        }

        // Определение типа транзакции по знаку суммы
        const transactionType = body.amount > 0 ? 'income' : 'expense';

        // Создание транзакции
        const { data, error } = await supabase
          .from('transactions')
          .insert([{
            ...body,
            household_id: householdId,
            user_id: userId,
            type: transactionType
          }])
          .select()
          .single();

        if (error) {
          throw error;
        }

        return jsonResponse(data, 201);
      }
      // POST /transfers
      else if (pathParts.length === 4 && pathParts[3] === 'transfers') {
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'editor'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        const body = await req.json();
        
        // Валидация данных для перевода
        const validation = validateData(body, validationSchemas.transfer);
        if (!validation.isValid) {
          return errorResponse('Validation failed', 400, validation.errors.join(', '));
        }
        
        // Дополнительная проверка, что from и to аккаунты разные
        if (body.from_account_id === body.to_account_id) {
          return errorResponse('From and to accounts must be different', 400);
        }

        // Проверка принадлежности счетов к household
        const hasFromAccountAccess = await checkResourceAccess(userId, 'accounts', body.from_account_id, householdId);
        if (!hasFromAccountAccess) {
          return errorResponse(`From account ${body.from_account_id} not found or access denied`, 403);
        }
        
        const hasToAccountAccess = await checkResourceAccess(userId, 'accounts', body.to_account_id, householdId);
        if (!hasToAccountAccess) {
          return errorResponse(`To account ${body.to_account_id} not found or access denied`, 403);
        }

        // Создание перевода в транзакции
        const transferId = crypto.randomUUID();
        
        // Создание транзакции списания
        const { data: fromTx, error: fromTxError } = await supabase
          .from('transactions')
          .insert([{
            household_id: householdId,
            user_id: userId,
            account_id: body.from_account_id,
            amount: -Math.abs(body.amount), // Сумма всегда отрицательная для списания
            type: 'expense',
            description: body.description || `Transfer to account ${body.to_account_id}`,
            date: body.date || new Date().toISOString(),
            payee: body.payee || 'Transfer',
            note: body.note || `Transfer to account ${body.to_account_id}`,
            transfer_id: transferId,
            member_id: body.member_id
          }])
          .select()
          .single();

        if (fromTxError) {
          throw fromTxError;
        }

        // Создание транзакции зачисления
        const { data: toTx, error: toTxError } = await supabase
          .from('transactions')
          .insert([{
            household_id: householdId,
            user_id: userId,
            account_id: body.to_account_id,
            amount: Math.abs(body.amount), // Сумма всегда положительная для зачисления
            type: 'income',
            description: body.description || `Transfer from account ${body.from_account_id}`,
            date: body.date || new Date().toISOString(),
            payee: body.payee || 'Transfer',
            note: body.note || `Transfer from account ${body.from_account_id}`,
            transfer_id: transferId,
            member_id: body.member_id
          }])
          .select()
          .single();

        if (toTxError) {
          // Если не удалось создать транзакцию зачисления, откатываем транзакцию списания
          await supabase
            .from('transactions')
            .delete()
            .eq('id', fromTx.id);
            
          throw toTxError;
        }

        // Создание записи о переводе
        const { error: transferError } = await supabase
          .from('transfers')
          .insert([{
            id: transferId,
            from_tx_id: fromTx.id,
            to_tx_id: toTx.id
          }]);

        if (transferError) {
          // Если не удалось создать запись о переводе, откатываем обе транзакции
          await supabase
            .from('transactions')
            .delete()
            .or(`id.eq.${fromTx.id},id.eq.${toTx.id}`);
            
          throw transferError;
        }

        return jsonResponse({
          transfer_id: transferId,
          from_transaction: fromTx,
          to_transaction: toTx
        }, 201);
      }
    } else if (method === 'PATCH') {
      // PATCH /transactions/:id
      if (pathParts.length === 4) {
        const transactionId = pathParts[3];
        
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'editor'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        // Проверка принадлежности транзакции к household
        const hasAccess = await checkResourceAccess(userId, 'transactions', transactionId, householdId);
        if (!hasAccess) {
          return errorResponse(`Transaction ${transactionId} not found or access denied`, 404);
        }

        const body = await req.json();
        
        // Валидация данных с использованием схемы (проверяем только те поля, что присутствуют в запросе)
        const updateData = { ...body };
        const validation = validateData(updateData, validationSchemas.transaction);
        if (!validation.isValid) {
          return errorResponse('Validation failed', 400, validation.errors.join(', '));
        }
        
        // Обновление транзакции
        const { data, error } = await supabase
          .from('transactions')
          .update(updateData)
          .eq('id', transactionId)
          .eq('household_id', householdId)
          .select()
          .single();

        if (error) {
          throw error;
        }

        return jsonResponse(data);
      }
    } else if (method === 'DELETE') {
      // DELETE /transactions/:id
      if (pathParts.length === 4) {
        const transactionId = pathParts[3];
        
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'editor'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        // Проверка принадлежности транзакции к household
        const hasAccess = await checkResourceAccess(userId, 'transactions', transactionId, householdId);
        if (!hasAccess) {
          return errorResponse(`Transaction ${transactionId} not found or access denied`, 404);
        }

        // Удаление транзакции
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', transactionId)
          .eq('household_id', householdId);

        if (error) {
          throw error;
        }

        return jsonResponse({ message: 'Transaction deleted successfully' });
      }
    }

    // Если маршрут не найден
    return errorResponse('Route not found', 404);
  } catch (error) {
    console.error('Error in transactions API:', error);
    return errorResponse('Internal server error', 500, error.message);
  }
});