
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

// Mock function similar to app/actions.ts
function normalizeName(name: string): string {
    return name ? name.toLowerCase().trim().replace(/\s+/g, ' ') : '';
}

async function debugMatching() {
  console.log('--- Debugging Tenant Matching Logic ---');
  
  // 1. Fetch Tenants
  const { data: dbTenants } = await supabase.from('tenants').select('*');
  if (!dbTenants) { console.error("No tenants found"); return; }
  console.log(`Loaded ${dbTenants.length} tenants from DB.`);

  // 2. Fetch Payments
  const { data: payments } = await supabase.from('payments').select('*').limit(20);
  if (!payments) { console.error("No payments found"); return; }
  console.log(`Loaded ${payments.length} payments for testing.`);

  // 3. Simulate Logic
  console.log('\n--- Simulation Results ---');
  
  payments.forEach(row => {
      let matchMethod = 'NONE';
      let foundTenant = null;

      // Logic from app/actions.ts (Priority 2)
      const potentialSageId = row.room_code?.toString().trim();
      const dbTenantByRoom = dbTenants.find(t => t.sage_id === potentialSageId); // Note: DB column is sage_id

      if (dbTenantByRoom) {
          matchMethod = 'SAGE_ID (via room_code)';
          foundTenant = dbTenantByRoom;
      } else {
          // Priority 3: Name
          const normName = normalizeName(row.tenant_name);
          const dbTenantByName = dbTenants.find(t => normalizeName(t.tenant_name) === normName);
          
          if (dbTenantByName) {
              matchMethod = 'NAME_EXACT';
              foundTenant = dbTenantByName;
          }
      }

      console.log(`Payment: [Room: ${row.room_code}] [Name: ${row.tenant_name}]`);
      if (foundTenant) {
          console.log(`   ✅ MATCH: ${matchMethod} -> Tenant: [Sage: ${foundTenant.sage_id}] [Room: ${foundTenant.room_code}] [Name: ${foundTenant.tenant_name}]`);
      } else {
          console.log(`   ❌ NO MATCH. Fallback would use Room: ${row.room_code}`);
      }
      console.log('------------------------------------------------');
  });
}

debugMatching();
