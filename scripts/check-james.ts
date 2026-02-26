import 'dotenv/config';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { supabase } from '../lib/supabaseClient';

async function main() {
  console.log("Checking payments for James Fitzgerald (2026)...");

  const { data: payments, error } = await supabase
    .from('payments')
    .select('*')
    .ilike('tenant_name', '%James Fitzgerald%')
    .eq('year', 2026)
    .lt('week_number', 10)
    .order('week_number', { ascending: true });

  if (error) {
    console.error("Error fetching payments:", error);
    return;
  }

  if (!payments || payments.length === 0) {
    console.log("No payments found for James Fitzgerald in 2026 (first 10 weeks).");
    return;
  }

  console.log(`Found ${payments.length} payments.`);
  
  console.table(payments.map(p => ({
      Week: p.week_number,
      Date: p.transaction_date,
      Amount: p.amount,
      Room: p.room_code,
      Ref: p.reference,
      Type: p.transaction_type,
      // Details might be long, let's see
  })));
}

main();
