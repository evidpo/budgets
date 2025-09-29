import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Transaction, TransactionFilter } from '@/lib/types';
import { useRealtimeSubscription } from './useRealtimeSubscription';

interface UseRealtimeTransactionsProps {
  filter?: TransactionFilter;
}

export const useRealtimeTransactions = ({ filter = {} }: UseRealtimeTransactionsProps = {}) => {
 const queryClient = useQueryClient();
  const householdId = filter.household_id || ''; // Предполагаем, что фильтр содержит household_id

  // Получаем данные через React Query
  const queryResult = useQuery<Transaction[], Error>({
    queryKey: ['transactions', filter],
    queryFn: async () => {
      const result = await api.getTransactions(filter);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
  });

  // Подписываемся на реалтайм-обновления, если известен householdId
 if (householdId) {
    useRealtimeSubscription('transactions', householdId, (data) => {
      const { eventType, record, oldRecord } = data;
      
      // Обновляем кэш в зависимости от типа события
      queryClient.setQueryData<Transaction[]>(['transactions', filter], (prevData) => {
        if (!prevData) return prevData;
        
        // Проверяем, соответствует ли обновленная запись фильтрам
        const matchesFilter = (transaction: Transaction): boolean => {
          if (filter.from_date && transaction.date < filter.from_date) return false;
          if (filter.to_date && transaction.date > filter.to_date) return false;
          if (filter.account_ids && filter.account_ids.length > 0 && 
              !filter.account_ids.includes(transaction.account_id)) return false;
          if (filter.category_ids && filter.category_ids.length > 0 && 
              transaction.category_id && !filter.category_ids.includes(transaction.category_id)) return false;
          if (filter.member_id && transaction.member_id !== filter.member_id) return false;
          if (filter.debt_id && transaction.debt_id !== filter.debt_id) return false;
          if (filter.exclude_transfers && transaction.transfer_id) return false;
          
          return true;
        };
        
        let newData = [...prevData];
        
        switch (eventType) {
          case 'INSERT':
            // Добавляем новую запись, если она соответствует фильтрам
            if (matchesFilter(record as Transaction)) {
              newData = [...newData, record as Transaction];
            }
            break;
          case 'UPDATE':
            // Проверяем, соответствует ли старая и новая запись фильтрам
            const oldMatches = matchesFilter(oldRecord as Transaction);
            const newMatches = matchesFilter(record as Transaction);
            
            if (oldMatches && newMatches) {
              // Обновляем существующую запись
              newData = newData.map(item => 
                item.id === record.id ? { ...record as Transaction } : item
              );
            } else if (oldMatches && !newMatches) {
              // Удаляем запись, так как она больше не соответствует фильтрам
              newData = newData.filter(item => item.id !== (oldRecord as Transaction).id);
            } else if (!oldMatches && newMatches) {
              // Добавляем запись, так как она теперь соответствует фильтрам
              newData = [...newData, record as Transaction];
            }
            break;
          case 'DELETE':
            // Удаляем запись, если она соответствовала фильтрам
            if (matchesFilter(oldRecord as Transaction)) {
              newData = newData.filter(item => item.id !== (oldRecord as Transaction).id);
            }
            break;
        }
        
        // Сортируем по дате (новые первее)
        newData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        return newData;
      });
    });
  }

  return queryResult;
};