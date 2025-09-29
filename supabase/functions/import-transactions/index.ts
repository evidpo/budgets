// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const { transactions, importId, userId } = body;

    // Валидация входных данных
    if (!Array.isArray(transactions) || !importId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid input data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Добавляем import_id к каждой транзакции
    const transactionsWithImportId = transactions.map(t => ({
      ...t,
      import_id: importId,
      user_id: userId
    }));

    // Вставка транзакций в базу данных
    const { data, error } = await supabase
      .from('transactions')
      .insert(transactionsWithImportId);

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ message: 'Transactions imported successfully', count: data?.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error importing transactions:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});