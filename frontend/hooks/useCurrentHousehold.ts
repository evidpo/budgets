import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Household } from '@/lib/types';

export function useCurrentHousehold() {
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentHousehold();
  }, []);

  async function fetchCurrentHousehold() {
    try {
      setLoading(true);
      
      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Пользователь не авторизован');
        return;
      }
      
      // Получаем список домохозяйств, в которых участвует пользователь
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('household_id')
        .eq('user_id', user.id);
      
      if (membersError) throw membersError;
      
      if (!members || members.length === 0) {
        setError('Пользователь не состоит ни в одном домохозяйстве');
        return;
      }
      
      // Берем первое домохозяйство из списка (в будущем можно реализовать выбор активного)
      const householdId = members[0].household_id;
      
      // Получаем информацию о домохозяйстве
      const { data: householdData, error: householdError } = await supabase
        .from('households')
        .select('*')
        .eq('id', householdId)
        .single();
      
      if (householdError) throw householdError;
      
      setHousehold(householdData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке домохозяйства');
      console.error('Error fetching current household:', err);
    } finally {
      setLoading(false);
    }
  }

  return { household, loading, error, refetch: fetchCurrentHousehold };
}