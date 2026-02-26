
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Credentials missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
  // Pegar 1 registro que tenha raw_data
  const { data, error } = await supabase
    .from('payments')
    .select('raw_data')
    .not('raw_data', 'is', null)
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  if (!data) {
    console.log('No raw_data found in payments table.');
    return;
  }

  console.log('--- Sample Raw Data ---');
  console.log(JSON.stringify(data.raw_data, null, 2));
}

inspect();
