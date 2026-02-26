
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

async function debugMatchingV2() {
  console.log('--- Debugging Tenant Matching Logic V2 ---');
  
  // 1. Fetch Tenants
  const { data: dbTenants } = await supabase.from('tenants').select('*');
  if (!dbTenants) { console.error("No tenants found"); return; }
  
  // Simulate fetchTenants mapping
  const mappedTenants = dbTenants.map(t => ({
      sageId: t.sage_id,
      roomCode: t.room_code,
      tenantName: t.tenant_name
  }));

  console.log(`Loaded ${mappedTenants.length} tenants.`);
  console.log("Sample Tenant Sage ID:", mappedTenants[0].sageId, typeof mappedTenants[0].sageId);

  // 2. Fetch Payments
  const { data: payments } = await supabase.from('payments').select('*').limit(5);
  if (!payments) { console.error("No payments found"); return; }
  console.log(`Loaded ${payments.length} payments.`);
  console.log("Sample Payment Room Code:", payments[0].room_code, typeof payments[0].room_code);

  // 3. Simulate Logic
  console.log('\n--- Simulation Results ---');
  
  payments.forEach(row => {
      const potentialSageId = row.room_code?.toString().trim();
      
      // LOGICA EXATA DO ACTIONS.TS
      const dbTenantBySage = mappedTenants.find(t => String(t.sageId).trim() === potentialSageId);

      console.log(`Payment: [Room: ${row.room_code}]`);
      if (dbTenantBySage) {
          console.log(`   ✅ MATCH: Tenant: [Sage: ${dbTenantBySage.sageId}] [Room: ${dbTenantBySage.roomCode}]`);
      } else {
          console.log(`   ❌ NO MATCH. Fallback would use Room: ${row.room_code}`);
          // Check why failed
          const rawMatch = mappedTenants.find(t => t.sageId == potentialSageId);
          if (rawMatch) {
              console.log(`      But found loose match: ${rawMatch.sageId} (${typeof rawMatch.sageId}) vs ${potentialSageId} (${typeof potentialSageId})`);
          }
      }
      console.log('------------------------------------------------');
  });
}

debugMatchingV2();
