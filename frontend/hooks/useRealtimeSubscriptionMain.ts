import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { 
  Transaction, 
  Account, 
  Budget, 
  Category, 
  Debt 
} from '@/lib/types';

// Типы для реалтайм-событий
type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';
type RealtimeFilter = {
  event: RealtimeEvent;
  schema?: string;
  table: string;
 filter?: string;
};

// Типы данных для обновлений
type RealtimeData<T> = {
  eventType: RealtimeEvent;
  table: string;
  record: T;
  oldRecord?: T;
};

// Хук для подписки на реалтайм-обновления
export function useRealtimeSubscription(
  tableName: 'transactions' | 'accounts' | 'budgets' | 'debts' | 'categories',
  householdId: string,
  onUpdate?: (data: RealtimeData<any>) => void
) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    // Формируем фильтр для подписки с учетом household_id для безопасности
    const filters: RealtimeFilter[] = [
      {
        event: 'INSERT',
        table: tableName,
        filter: `household_id=eq.${householdId}`,
      },
      {
        event: 'UPDATE',
        table: tableName,
        filter: `household_id=eq.${householdId}`,
      },
      {
        event: 'DELETE',
        table: tableName,
        filter: `household_id=eq.${householdId}`,
      },
    ];

    // Подписываемся на реалтайм-обновления
    const channel = supabase
      .channel(`realtime-${tableName}-${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          // Создаем объект данных для обновления
          const updateData: RealtimeData<any> = {
            eventType,
            table: tableName,
            record: newRecord || oldRecord,
            oldRecord: oldRecord || undefined,
          };

          // Вызываем пользовательский обработчик, если он есть
          if (onUpdate) {
            onUpdate(updateData);
          }

          // Инвалидируем соответствующие кэши в React Query
          switch (tableName) {
            case 'transactions':
              queryClient.invalidateQueries({ queryKey: ['transactions'] });
              queryClient.invalidateQueries({ 
                queryKey: ['households', householdId] 
              });
              break;
            case 'accounts':
              queryClient.invalidateQueries({ 
                queryKey: ['accounts', householdId] 
              });
              queryClient.invalidateQueries({ 
                queryKey: ['households', householdId] 
              });
              break;
            case 'budgets':
              queryClient.invalidateQueries({ 
                queryKey: ['budgets', householdId] 
              });
              queryClient.invalidateQueries({ 
                queryKey: ['budget', updateData.record?.id] 
              });
              break;
            case 'categories':
              queryClient.invalidateQueries({ 
                queryKey: ['categories', householdId] 
              });
              break;
            case 'debts':
              queryClient.invalidateQueries({ 
                queryKey: ['debts', householdId] 
              });
              break;
          }
        }
      )
      .subscribe();

    // Сохраняем ссылку на подписку
    subscriptionRef.current = channel;

    // Отписываемся при размонтировании
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [tableName, householdId, queryClient, onUpdate]);

  // Функция для отключения подписки
  const unsubscribe = () => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
  };

  return { unsubscribe };
}