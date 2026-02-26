
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

async function compareData() {
  console.log('--- Comparando Inquilinos vs Pagamentos ---');
  
  // 1. Pegar alguns inquilinos reais
  const { data: tenants } = await supabase
    .from('tenants')
    .select('sage_id, tenant_name, room_code')
    .limit(10);
    
  console.log('\n--- Exemplos de Inquilinos (DB) ---');
  console.table(tenants);

  // 2. Pegar alguns pagamentos
  const { data: payments } = await supabase
    .from('payments')
    .select('tenant_name, room_code, reference, details')
    .limit(20);

  console.log('\n--- Exemplos de Pagamentos (DB) ---');
  console.table(payments);
}

compareData();
