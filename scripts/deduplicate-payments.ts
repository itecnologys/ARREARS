
import 'dotenv/config';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

async function main() {
  console.log("Starting deduplication process for 2026 payments (using SERVICE_ROLE_KEY)...");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY or URL in .env.local");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch all payments for 2026
  const { data: payments, error } = await supabase
    .from('payments')
    .select('id, transaction_date, amount, room_code, tenant_name, reference')
    .eq('year', 2026);

  if (error) {
    console.error("Error fetching payments:", error);
    return;
  }

  if (!payments || payments.length === 0) {
    console.log("No payments found for 2026.");
    return;
  }

  console.log(`Fetched ${payments.length} payments. Identifying duplicates to remove...`);

  const keyMap = new Map<string, any[]>();
  const idsToDelete: number[] = [];

  for (const p of payments) {
    // Create a unique key for the transaction
    const key = `${p.transaction_date}|${p.amount}|${p.room_code}|${p.tenant_name?.toLowerCase()}|${p.reference?.toLowerCase()}`;
    
    if (!keyMap.has(key)) {
      keyMap.set(key, []);
    }
    keyMap.get(key)!.push(p);
  }

  for (const [key, group] of keyMap.entries()) {
    if (group.length > 1) {
      // Sort by ID to keep the oldest (or newest, doesn't matter much if identical)
      // Let's keep the one with the smallest ID (likely first inserted)
      group.sort((a, b) => a.id - b.id);
      
      // Mark all but the first for deletion
      const duplicates = group.slice(1);
      duplicates.forEach(d => idsToDelete.push(d.id));
    }
  }

  console.log(`Found ${idsToDelete.length} duplicate records to delete.`);

  if (idsToDelete.length === 0) {
    console.log("No duplicates found. Exiting.");
    return;
  }

  // Delete in batches of 100 to be safe
  const batchSize = 100;
  for (let i = 0; i < idsToDelete.length; i += batchSize) {
    const batch = idsToDelete.slice(i, i + batchSize);
    console.log(`Deleting batch ${i / batchSize + 1} (${batch.length} records)...`);
    
    const { error: deleteError } = await supabase
      .from('payments')
      .delete()
      .in('id', batch);

    if (deleteError) {
      console.error("Error deleting batch:", deleteError);
      return;
    }
  }

  console.log("Deduplication complete.");
}

main();
