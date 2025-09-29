import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// Получаем URL и анонимный ключ из переменных окружения
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Создаем клиент Supabase
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

// Типизированный клиент для использования в приложении
export type SupabaseClient = typeof supabase;

// Функция для получения клиента Supabase
export const getSupabaseClient = (): SupabaseClient => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Необходимо указать SUPABASE_URL и SUPABASE_ANON_KEY в переменных окружения');
  }
  return supabase;
};

// Экспорт утилит для работы с аутентификацией
export const {
  auth,
  channel,
  from,
  functions,
  rpc,
  schema,
  setAuth,
  realtime,
  removeSubscription,
  removeChannel,
  listChannels
} = supabase;

// Экспорт типов для использования в приложении
export type {
  Database,
  Tables,
  Functions,
  Enums
} from './database.types';