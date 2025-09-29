import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Budget } from '@/lib/types';
import { useRealtimeSubscription } from './useRealtimeSubscription';

interface UseRealtimeBudgetsProps {
  householdId: string;
}

export const useRealtimeBudgets = ({ householdId }: UseRealtimeBudgetsProps) => {
  const queryClient = useQueryClient();

  // Получаем данные через React Query
  const queryResult = useQuery<Budget[], Error>({
    queryKey: ['budgets', householdId],
    queryFn: async () => {
      const result = await api.getBudgets(householdId);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    enabled: !!householdId,
  });

  // Подписываемся на реалтайм-обновления
  useRealtimeSubscription('budgets', householdId, (data) => {
    const { eventType, record, oldRecord } = data;
    
    // Обновляем кэш в зависимости от типа события
    queryClient.setQueryData<Budget[]>(['budgets', householdId], (prevData) => {
      if (!prevData) return prevData;
      
      let newData = [...prevData];
      
      switch (eventType) {
        case 'INSERT':
          // Добавляем новую запись
          newData = [...newData, record as Budget];
          break;
        case 'UPDATE':
          // Обновляем существующую запись
          newData = newData.map(item => 
            item.id === record.id ? { ...record as Budget } : item
          );
          break;
        case 'DELETE':
          // Удаляем запись
          newData = newData.filter(item => item.id !== (oldRecord as Budget).id);
          break;
      }
      
      // Сортируем по sort_order и name
      newData.sort((a, b) => {
        if (a.sort_order !== b.sort_order) {
          return a.sort_order - b.sort_order;
        }
        return a.name.localeCompare(b.name);
      });
      
      return newData;
    });
  });

  return queryResult;
};