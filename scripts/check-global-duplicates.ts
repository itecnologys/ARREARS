
import 'dotenv/config';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { supabase } from '../lib/supabaseClient';

async function main() {
  console.log("Checking for global duplicates in 2026 payments...");

  // Fetch all payments for 2026
  // Note: If dataset is huge, we should paginate. Assuming manageable for now or limit to recent.
  const { data: payments, error } = await supabase
    .from('payments')
    .select('id, transaction_date, amount, room_code, tenant_name, reference, week_number')
    .eq('year', 2026);

  if (error) {
    console.error("Error fetching payments:", error);
    return;
  }

  if (!payments || payments.length === 0) {
    console.log("No payments found for 2026.");
    return;
  }

  console.log(`Fetched ${payments.length} payments. Analyzing for duplicates...`);

  const keyMap = new Map<string, any[]>();
  let duplicateGroups = 0;
  let totalDuplicates = 0;

  for (const p of payments) {
    // Create a unique key for the transaction
    // normalizing strings to lower case to be safe
    const key = `${p.transaction_date}|${p.amount}|${p.room_code}|${p.tenant_name?.toLowerCase()}|${p.reference?.toLowerCase()}`;
    
    if (!keyMap.has(key)) {
      keyMap.set(key, []);
    }
    keyMap.get(key)!.push(p);
  }

  for (const [key, group] of keyMap.entries()) {
    if (group.length > 1) {
      duplicateGroups++;
      totalDuplicates += (group.length - 1);
      if (duplicateGroups <= 5) {
         console.log(`Duplicate found (x${group.length}): ${key}`);
      }
    }
  }

  console.log("\nSummary:");
  console.log(`Total payment records: ${payments.length}`);
  console.log(`Unique transactions: ${keyMap.size}`);
  console.log(`Duplicate groups: ${duplicateGroups}`);
  console.log(`Total redundant records to delete: ${totalDuplicates}`);
}

main();
