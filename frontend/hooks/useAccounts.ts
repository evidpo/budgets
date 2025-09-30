import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Account } from '@/lib/types';

export function useAccounts(householdId: string | null) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (householdId) {
      fetchAccounts();
    }
  }, [householdId]);

  async function fetchAccounts() {
    if (!householdId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('household_id', householdId)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      setAccounts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке счетов');
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  }

  return { accounts, loading, error, refetch: fetchAccounts };
}