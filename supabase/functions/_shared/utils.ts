// Вспомогательные утилиты для API функций
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Тип для ошибок API
export interface ApiError {
  error: string;
  details?: string;
}

// Тип для успешного ответа
export interface ApiResponse<T = any> {
 data?: T;
  error?: ApiError;
}

// Вспомогательная функция для формирования JSON-ответа
export function jsonResponse(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Client-Info',
    },
  });
}

// Вспомогательная функция для обработки ошибок
export function errorResponse(message: string, status: number = 400, details?: string) {
  return jsonResponse({ error: { error: message, details } }, status);
}

// Вспомогательная функция для извлечения JWT токена из заголовков
export function extractToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
 return authHeader.substring(7);
}

// Вспомогательная функция для проверки household_id пользователя
export async function getUserHousehold(token: string): Promise<{ userId: string; householdId: string } | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return null;
    }

    // Получаем household_id пользователя из таблицы members
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('household_id')
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return null;
    }

    return { userId: user.id, householdId: member.household_id };
  } catch (error) {
    console.error('Error getting user household:', error);
    return null;
  }
}

// Вспомогательная функция для проверки прав доступа к ресурсу
export async function checkResourceAccess(userId: string, resourceTable: string, resourceId: string, householdId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from(resourceTable)
      .select('id')
      .eq('id', resourceId)
      .eq('household_id', householdId)
      .limit(1);

    if (error) {
      console.error(`Error checking access to ${resourceTable} ${resourceId}:`, error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error(`Error checking access to ${resourceTable} ${resourceId}:`, error);
    return false;
  }
}

// Вспомогательная функция для проверки роли пользователя в household
export async function getUserRole(userId: string, householdId: string): Promise<string | null> {
  try {
    const { data: member, error } = await supabase
      .from('members')
      .select('role')
      .eq('user_id', userId)
      .eq('household_id', householdId)
      .single();

    if (error || !member) {
      return null;
    }

    return member.role;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
 }
}

// Вспомогательная функция для проверки прав доступа
export async function hasAccess(role: string, requiredRole: string): Promise<boolean> {
  const roleHierarchy = {
    'viewer': 1,
    'editor': 2,
    'owner': 3
  };

  const userLevel = roleHierarchy[role as keyof typeof roleHierarchy] || 0;
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

  return userLevel >= requiredLevel;
}