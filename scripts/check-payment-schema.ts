
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPaymentColumns() {
  console.log('--- Verificando estrutura da tabela payments ---');
  
  // Tenta buscar 1 linha para ver as chaves retornadas
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Erro ao buscar dados:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Colunas encontradas:', Object.keys(data[0]));
    console.log('Exemplo de registro:', data[0]);
  } else {
    console.log('Tabela vazia ou sem dados.');
  }
}

checkPaymentColumns();
