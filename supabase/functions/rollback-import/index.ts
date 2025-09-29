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
    const { importId, userId } = body;

    // Валидация входных данных
    if (!importId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid input data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Удаляем транзакции, связанные с этим импортом
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('import_id', importId)
      .eq('user_id', userId); // Защита от удаления чужих транзакций

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ message: 'Import rolled back successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error rolling back import:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});