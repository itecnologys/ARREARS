
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const { data: page1, error: err1 } = await supabase
    .from('payments')
    .select('year')
    .range(0, 999);

  const { data: page2, error: err2 } = await supabase
    .from('payments')
    .select('year')
    .range(1000, 1999);

  if (err1 || err2) {
    console.error(err1 || err2);
    return;
  }

  const allData = [...(page1 || []), ...(page2 || [])];
  console.log('Total records fetched (2 pages):', allData.length);
  
  const counts: Record<string, number> = {};
  allData.forEach((row: any) => {
    counts[row.year] = (counts[row.year] || 0) + 1;
  });

  console.log('Records per year:', counts);
}

check();
