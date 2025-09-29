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
      // GET /categories
      if (pathParts.length === 3) { // ['', 'categories', '']
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'viewer'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        // Получение параметров фильтрации
        const parentId = url.searchParams.get('parent_id');
        const type = url.searchParams.get('type'); // 'income' или 'expense'
        const includeSubtree = url.searchParams.get('include_subtree') === 'true';

        // Получение категорий
        let query = supabase
          .from('categories')
          .select(`
            id, 
            parent_id, 
            name, 
            type, 
            path, 
            icon, 
            color, 
            created_at, 
            updated_at, 
            version
          `)
          .eq('household_id', householdId)
          .order('name', { ascending: true });

        if (parentId !== null) { // Проверяем на null, т.к. undefined !== null
          if (parentId === '') {
            // Если parent_id пустой, ищем корневые категории (без родителя)
            query = query.is('parent_id', null);
          } else {
            query = query.eq('parent_id', parentId);
          }
        }
        
        if (type) {
          query = query.eq('type', type);
        }

        const { data, error } = await query;
        if (error) {
          throw error;
        }

        // Если запрошено включение поддерева, строим иерархию
        if (includeSubtree) {
          // Сначала строим мапу всех категорий для быстрого поиска
          const categoryMap = new Map();
          data.forEach(cat => {
            categoryMap.set(cat.id, { ...cat, children: [] });
          });

          // Затем создаем иерархию
          const rootCategories = [];
          data.forEach(cat => {
            const category = categoryMap.get(cat.id);
            if (cat.parent_id && categoryMap.has(cat.parent_id)) {
              // Если у категории есть родитель, добавляем её к родителю
              const parent = categoryMap.get(cat.parent_id);
              parent.children.push(category);
            } else {
              // Если у категории нет родителя в этом наборе, она корневая
              rootCategories.push(category);
            }
          });

          return jsonResponse(rootCategories);
        }

        return jsonResponse(data);
      }
    } else if (method === 'POST') {
      // POST /categories
      if (pathParts.length === 3) { // ['', 'categories', '']
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'editor'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        const body = await req.json();
        
        // Валидация данных с использованием схемы
        const validation = validateData(body, validationSchemas.category);
        if (!validation.isValid) {
          return errorResponse('Validation failed', 400, validation.errors.join(', '));
        }

        // Проверка родительской категории, если указана
        let parentCategory = null;
        if (body.parent_id) {
          const hasParentAccess = await checkResourceAccess(userId, 'categories', body.parent_id, householdId);
          if (!hasParentAccess) {
            return errorResponse(`Parent category ${body.parent_id} not found or access denied`, 403);
          }
          
          // Получаем информацию о родительской категории
          const { data: parent, error: parentError } = await supabase
            .from('categories')
            .select('path, type')
            .eq('id', body.parent_id)
            .eq('household_id', householdId)
            .single();
            
          if (parentError) {
            throw parentError;
          }
          
          parentCategory = parent;
          
          // Проверяем, что тип подкатегории совпадает с типом родительской категории
          if (parentCategory.type !== body.type) {
            return errorResponse('Subcategory type must match parent category type', 400);
          }
        }

        // Формируем путь категории
        let path = body.name;
        if (parentCategory) {
          path = `${parentCategory.path}:${body.name}`;
        }

        // Создание категории
        const { data, error } = await supabase
          .from('categories')
          .insert([{
            ...body,
            household_id: householdId,
            path
          }])
          .select()
          .single();

        if (error) {
          throw error;
        }

        return jsonResponse(data, 201);
      }
    } else if (method === 'PATCH') {
      // PATCH /categories/:id
      if (pathParts.length === 4) {
        const categoryId = pathParts[3];
        
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'editor'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        // Проверка принадлежности категории к household
        const hasAccess = await checkResourceAccess(userId, 'categories', categoryId, householdId);
        if (!hasAccess) {
          return errorResponse(`Category ${categoryId} not found or access denied`, 404);
        }

        const body = await req.json();
        
        // Валидация данных с использованием схемы (проверяем только те поля, что присутствуют в запросе)
        const updateData = { ...body };
        const validation = validateData(updateData, validationSchemas.category);
        if (!validation.isValid) {
          return errorResponse('Validation failed', 400, validation.errors.join(', '));
        }
        
        // Получаем текущую категорию для обновления пути
        const { data: currentCategory, error: currentError } = await supabase
          .from('categories')
          .select('parent_id, path, type')
          .eq('id', categoryId)
          .eq('household_id', householdId)
          .single();

        if (currentError) {
          throw currentError;
        }

        // Проверяем, не пытаемся ли мы изменить тип категории
        if (updateData.type && updateData.type !== currentCategory.type) {
          return errorResponse('Cannot change category type', 400);
        }

        // Проверяем, не пытаемся ли мы сделать категорию потомком самой себя
        if (updateData.parent_id && updateData.parent_id === categoryId) {
          return errorResponse('Category cannot be a parent of itself', 400);
        }

        // Проверяем, что новая родительская категория существует и принадлежит household
        if (body.parent_id && body.parent_id !== currentCategory.parent_id) {
          // Проверяем, что новая родительская категория не является потомком текущей категории
          // (чтобы избежать циклических зависимостей)
          if (currentCategory.path.startsWith(`${body.parent_id}:`)) {
            return errorResponse('Cannot set a descendant as parent', 400);
          }
          
          const hasNewParentAccess = await checkResourceAccess(userId, 'categories', body.parent_id, householdId);
          if (!hasNewParentAccess) {
            return errorResponse(`New parent category ${body.parent_id} not found or access denied`, 403);
          }
          
          // Получаем информацию о новой родительской категории
          const { data: newParent, error: newParentError } = await supabase
            .from('categories')
            .select('path, type')
            .eq('id', body.parent_id)
            .eq('household_id', householdId)
            .single();
            
          if (newParentError) {
            throw newParentError;
          }
          
          // Проверяем, что тип подкатегории совпадает с типом родительской категории
          if (newParent.type !== currentCategory.type) {
            return errorResponse('Subcategory type must match parent category type', 400);
          }
        }

        // Обновление категории
        const updateData: any = { ...body };
        
        // Если изменился родитель, пересчитываем путь
        if (body.parent_id !== undefined && body.parent_id !== currentCategory.parent_id) {
          let newPath = body.name || currentCategory.name;
          if (body.parent_id) {
            // Получаем путь родительской категории
            const { data: parent, error: parentError } = await supabase
              .from('categories')
              .select('path')
              .eq('id', body.parent_id)
              .eq('household_id', householdId)
              .single();
              
            if (parentError) {
              throw parentError;
            }
            
            newPath = `${parent.path}:${body.name || currentCategory.name}`;
          }
          
          updateData.path = newPath;
          
          // Также обновляем пути всех дочерних категорий
          await updateChildPaths(categoryId, newPath, householdId);
        } else if (body.name && body.name !== currentCategory.name) {
          // Если изменилось только имя, обновляем путь текущей категории
          if (currentCategory.parent_id) {
            // Получаем путь родительской категории
            const { data: parent, error: parentError } = await supabase
              .from('categories')
              .select('path')
              .eq('id', currentCategory.parent_id)
              .eq('household_id', householdId)
              .single();
              
            if (parentError) {
              throw parentError;
            }
            
            updateData.path = `${parent.path}:${body.name}`;
          } else {
            updateData.path = body.name;
          }
          
          // Также обновляем пути всех дочерних категорий
          await updateChildPaths(categoryId, updateData.path, householdId);
        }

        const { data, error } = await supabase
          .from('categories')
          .update(updateData)
          .eq('id', categoryId)
          .eq('household_id', householdId)
          .select()
          .single();

        if (error) {
          throw error;
        }

        return jsonResponse(data);
      }
    } else if (method === 'DELETE') {
      // DELETE /categories/:id
      if (pathParts.length === 4) {
        const categoryId = pathParts[3];
        
        // Проверка прав доступа
        if (!(await hasAccess(userRole, 'editor'))) {
          return errorResponse('Insufficient permissions', 403);
        }

        // Проверка принадлежности категории к household
        const hasAccess = await checkResourceAccess(userId, 'categories', categoryId, householdId);
        if (!hasAccess) {
          return errorResponse(`Category ${categoryId} not found or access denied`, 404);
        }

        // Проверяем, есть ли у категории дочерние элементы
        const { data: children, error: childrenError } = await supabase
          .from('categories')
          .select('id')
          .eq('parent_id', categoryId)
          .eq('household_id', householdId);
          
        if (childrenError) {
          throw childrenError;
        }
        
        if (children && children.length > 0) {
          return errorResponse('Cannot delete category with children', 400);
        }

        // Удаление категории
        const { error } = await supabase
          .from('categories')
          .delete()
          .eq('id', categoryId)
          .eq('household_id', householdId);

        if (error) {
          throw error;
        }

        return jsonResponse({ message: 'Category deleted successfully' });
      }
    }

    // Если маршрут не найден
    return errorResponse('Route not found', 404);
  } catch (error) {
    console.error('Error in categories API:', error);
    return errorResponse('Internal server error', 500, error.message);
  }
});

// Вспомогательная функция для обновления путей дочерних категорий
async function updateChildPaths(parentId: string, parentPath: string, householdId: string) {
  // Получаем все дочерние категории
 const { data: children, error } = await supabase
    .from('categories')
    .select('id, name, path')
    .eq('parent_id', parentId)
    .eq('household_id', householdId);
    
  if (error) {
    console.error('Error getting child categories:', error);
    return;
 }
  
  // Обновляем путь для каждой дочерней категории
  for (const child of children) {
    const newPath = `${parentPath}:${child.name}`;
    
    const { error: updateError } = await supabase
      .from('categories')
      .update({ path: newPath })
      .eq('id', child.id)
      .eq('household_id', householdId);
      
    if (updateError) {
      console.error(`Error updating path for category ${child.id}:`, updateError);
    } else {
      // Рекурсивно обновляем пути потомков
      await updateChildPaths(child.id, newPath, householdId);
    }
 }
}