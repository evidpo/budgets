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
      // GET /rules
      if (pathParts.length === 3) { // ['', 'rules', '']
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'viewer'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        // Получение параметров фильтрации
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = (page - 1) * limit;
        const isActive = url.searchParams.get('is_active');

        // Получение правил
        let query = supabase
          .from('rules')
          .select(`
            id, 
            type, 
            priority, 
            category_id, 
            pattern, 
            is_active, 
            created_at, 
            updated_at, 
            version,
            categories (name, type)
          `)
          .eq('household_id', householdId)
          .order('priority', { ascending: false }) // Сортировка по приоритету (высший приоритет первым)
          .order('created_at', { ascending: true })
          .range(offset, offset + limit - 1);

        if (isActive !== null) {
          query = query.eq('is_active', isActive === 'true');
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
      // POST /rules
      if (pathParts.length === 3) { // ['', 'rules', '']
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'editor'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        const body = await req.json();
        
        // Валидация данных с использованием схемы
        const validation = validateData(body, validationSchemas.rule);
        if (!validation.isValid) {
          return errorResponse('Validation failed', 400, validation.errors.join(', '));
        }

        // Проверка категории
        const hasCategoryAccess = await checkResourceAccess(userId, 'categories', body.category_id, householdId);
        if (!hasCategoryAccess) {
          return errorResponse(`Category ${body.category_id} not found or access denied`, 403);
        }

        // Создание правила
        const { data, error } = await supabase
          .from('rules')
          .insert([{
            ...body,
            household_id: householdId
          }])
          .select()
          .single();

        if (error) {
          throw error;
        }

        return jsonResponse(data, 201);
      }
      // POST /rules/apply
      else if (pathParts.length === 4 && pathParts[3] === 'apply') {
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'editor'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        const body = await req.json();
        
        // Применение правил к транзакции или массиву транзакций
        if (!body.transaction_id && !body.transaction_ids) {
          return errorResponse('Either transaction_id or transaction_ids must be provided', 400);
        }

        const transactionIds = body.transaction_id ? [body.transaction_id] : body.transaction_ids;
        
        if (!Array.isArray(transactionIds)) {
          return errorResponse('transaction_ids must be an array', 400);
        }

        // Получаем активные правила, отсортированные по приоритету
        const { data: rules, error: rulesError } = await supabase
          .from('rules')
          .select(`
            id, 
            type, 
            priority, 
            category_id, 
            pattern
          `)
          .eq('household_id', householdId)
          .eq('is_active', true)
          .order('priority', { ascending: false }); // Высший приоритет первым

        if (rulesError) {
          throw rulesError;
        }

        const results = [];
        
        for (const transactionId of transactionIds) {
          // Проверяем принадлежность транзакции к household
          const hasTransactionAccess = await checkResourceAccess(userId, 'transactions', transactionId, householdId);
          if (!hasTransactionAccess) {
            results.push({
              transaction_id: transactionId,
              success: false,
              error: `Transaction ${transactionId} not found or access denied`
            });
            continue;
          }

          // Получаем транзакцию
          const { data: transaction, error: transactionError } = await supabase
            .from('transactions')
            .select(`
              id, 
              payee, 
              description, 
              amount,
              category_id
            `)
            .eq('id', transactionId)
            .eq('household_id', householdId)
            .single();

          if (transactionError) {
            results.push({
              transaction_id: transactionId,
              success: false,
              error: transactionError.message
            });
            continue;
          }

          // Применяем правила к транзакции
          let matchedRule = null;
          let newCategoryId = transaction.category_id; // Изначально сохраняем текущую категорию

          // Сортируем правила по приоритету (уже отсортированы, но для ясности)
          for (const rule of rules) {
            let matches = false;

            switch (rule.type) {
              case 'payee':
                if (transaction.payee && rule.pattern && 
                    transaction.payee.toLowerCase().includes(rule.pattern.toLowerCase())) {
                  matches = true;
                }
                break;
              case 'regex':
                try {
                  const regex = new RegExp(rule.pattern, 'i');
                  const text = `${transaction.payee || ''} ${transaction.description || ''}`.toLowerCase();
                  matches = regex.test(text);
                } catch (e) {
                  console.error(`Invalid regex pattern in rule ${rule.id}:`, rule.pattern);
                  matches = false;
                }
                break;
              case 'amount_pattern':
                // Для amount_pattern можно реализовать различные проверки
                // Например, проверка на определенную сумму или диапазон
                if (rule.pattern) {
                  // Простая проверка - равенство суммы
                  const expectedAmount = parseFloat(rule.pattern);
                  if (!isNaN(expectedAmount) && Math.abs(transaction.amount - expectedAmount) < 0.01) {
                    matches = true;
                  }
                  // Можно добавить другие проверки для amount_pattern
                }
                break;
            }

            if (matches) {
              matchedRule = rule;
              newCategoryId = rule.category_id;
              break; // Применяем первое совпадение (с наивысшим приоритетом)
            }
          }

          // Обновляем категорию транзакции, если было совпадение
          if (matchedRule && newCategoryId !== transaction.category_id) {
            const { error: updateError } = await supabase
              .from('transactions')
              .update({ category_id: newCategoryId })
              .eq('id', transactionId)
              .eq('household_id', householdId);

            if (updateError) {
              results.push({
                transaction_id: transactionId,
                success: false,
                error: updateError.message
              });
            } else {
              results.push({
                transaction_id: transactionId,
                success: true,
                rule_applied: matchedRule.id,
                old_category_id: transaction.category_id,
                new_category_id: newCategoryId
              });
            }
          } else {
            // Нет совпадений или категория не изменилась
            results.push({
              transaction_id: transactionId,
              success: true,
              rule_applied: matchedRule ? matchedRule.id : null,
              old_category_id: transaction.category_id,
              new_category_id: newCategoryId
            });
          }
        }

        return jsonResponse({
          message: 'Rules applied successfully',
          results
        });
      }
    } else if (method === 'PATCH') {
      // PATCH /rules/:id
      if (pathParts.length === 4) {
        const ruleId = pathParts[3];
        
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'editor'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        // Проверка принадлежности правила к household
        const hasAccess = await checkResourceAccess(userId, 'rules', ruleId, householdId);
        if (!hasAccess) {
          return errorResponse(`Rule ${ruleId} not found or access denied`, 404);
        }

        const body = await req.json();
        
        // Валидация данных с использованием схемы (проверяем только те поля, что присутствуют в запросе)
        const updateData = { ...body };
        const validation = validateData(updateData, validationSchemas.rule);
        if (!validation.isValid) {
          return errorResponse('Validation failed', 400, validation.errors.join(', '));
        }

        // Проверка категории, если она изменяется
        if (updateData.category_id) {
          const hasCategoryAccess = await checkResourceAccess(userId, 'categories', updateData.category_id, householdId);
          if (!hasCategoryAccess) {
            return errorResponse(`Category ${updateData.category_id} not found or access denied`, 403);
          }
        }

        // Обновление правила
        const { data, error } = await supabase
          .from('rules')
          .update(body)
          .eq('id', ruleId)
          .eq('household_id', householdId)
          .select()
          .single();

        if (error) {
          throw error;
        }

        return jsonResponse(data);
      }
    } else if (method === 'DELETE') {
      // DELETE /rules/:id
      if (pathParts.length === 4) {
        const ruleId = pathParts[3];
        
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'editor'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        // Проверка принадлежности правила к household
        const hasAccess = await checkResourceAccess(userId, 'rules', ruleId, householdId);
        if (!hasAccess) {
          return errorResponse(`Rule ${ruleId} not found or access denied`, 404);
        }

        // Удаление правила
        const { error } = await supabase
          .from('rules')
          .delete()
          .eq('id', ruleId)
          .eq('household_id', householdId);

        if (error) {
          throw error;
        }

        return jsonResponse({ message: 'Rule deleted successfully' });
      }
    }

    // Если маршрут не найден
    return errorResponse('Route not found', 404);
  } catch (error) {
    console.error('Error in rules API:', error);
    return errorResponse('Internal server error', 500, error.message);
  }
});