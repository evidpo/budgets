import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Debt } from '@/lib/types';
import { useRealtimeSubscription } from './useRealtimeSubscription';

interface UseRealtimeDebtsProps {
  householdId: string;
}

export const useRealtimeDebts = ({ householdId }: UseRealtimeDebtsProps) => {
  const queryClient = useQueryClient();

  // Получаем данные через React Query
  const queryResult = useQuery<Debt[], Error>({
    queryKey: ['debts', householdId],
    queryFn: async () => {
      const result = await api.getDebts(householdId);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    enabled: !!householdId,
  });

  // Подписываемся на реалтайм-обновления
  useRealtimeSubscription('debts', householdId, (data) => {
    const { eventType, record, oldRecord } = data;
    
    // Обновляем кэш в зависимости от типа события
    queryClient.setQueryData<Debt[]>(['debts', householdId], (prevData) => {
      if (!prevData) return prevData;
      
      let newData = [...prevData];
      
      switch (eventType) {
        case 'INSERT':
          // Добавляем новую запись
          newData = [...newData, record as Debt];
          break;
        case 'UPDATE':
          // Обновляем существующую запись
          newData = newData.map(item => 
            item.id === record.id ? { ...record as Debt } : item
          );
          break;
        case 'DELETE':
          // Удаляем запись
          newData = newData.filter(item => item.id !== (oldRecord as Debt).id);
          break;
      }
      
      // Сортируем по имени
      newData.sort((a, b) => a.name.localeCompare(b.name));
      
      return newData;
    });
  });

  return queryResult;
};