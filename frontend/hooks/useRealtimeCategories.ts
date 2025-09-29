import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Category } from '@/lib/types';
import { useRealtimeSubscription } from './useRealtimeSubscription';

interface UseRealtimeCategoriesProps {
  householdId: string;
}

export const useRealtimeCategories = ({ householdId }: UseRealtimeCategoriesProps) => {
  const queryClient = useQueryClient();

  // Получаем данные через React Query
 const queryResult = useQuery<Category[], Error>({
    queryKey: ['categories', householdId],
    queryFn: async () => {
      const result = await api.getCategories(householdId);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    enabled: !!householdId,
  });

  // Подписываемся на реалтайм-обновления
  useRealtimeSubscription('categories', householdId, (data) => {
    const { eventType, record, oldRecord } = data;
    
    // Обновляем кэш в зависимости от типа события
    queryClient.setQueryData<Category[]>(['categories', householdId], (prevData) => {
      if (!prevData) return prevData;
      
      let newData = [...prevData];
      
      switch (eventType) {
        case 'INSERT':
          // Добавляем новую запись
          newData = [...newData, record as Category];
          break;
        case 'UPDATE':
          // Обновляем существующую запись
          newData = newData.map(item => 
            item.id === record.id ? { ...record as Category } : item
          );
          break;
        case 'DELETE':
          // Удаляем запись
          newData = newData.filter(item => item.id !== (oldRecord as Category).id);
          break;
      }
      
      // Сортируем по пути (path) для иерархии
      newData.sort((a, b) => a.path.localeCompare(b.path));
      
      return newData;
    });
  });

  return queryResult;
};