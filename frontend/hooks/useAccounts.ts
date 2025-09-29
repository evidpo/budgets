import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Account } from '@/lib/types';

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: false });

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