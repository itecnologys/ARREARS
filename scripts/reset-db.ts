import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in .env.local');
  process.exit(1);
}

// Client with service role to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetDatabase() {
  console.log('Starting database reset...');

  // 1. Delete all data from tables
  // We delete in order of dependency (child tables first) just in case, though CASCADE usually handles it.
  // payments is independent of tenants via FK (it uses text matching), but logically related.
  const tables = ['tenant_rent_history', 'tenant_absences', 'payments', 'tenants'];
  
  for (const table of tables) {
    console.log(`Clearing table ${table}...`);
    // Using neq to match all non-null IDs (effectively all rows)
    const { error } = await supabase
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); 
    
    if (error) {
      console.error(`Error clearing table ${table}:`, error);
    } else {
      console.log(`Table ${table} cleared.`);
    }
  }

  // 2. Insert test tenant
  console.log('Inserting test tenant...');
  
  const testTenant = {
    sage_id: '000',
    tenant_name: 'Residente-00',
    room_code: 'Apartment 00',
    weekly_rent: 41.00,
    status: 'active',
    start_date: '2023-01-01',
    staff_name: 'Test Staff'
  };

  const { data: tenantData, error: tenantError } = await supabase
    .from('tenants')
    .insert(testTenant)
    .select()
    .single();

  if (tenantError) {
    console.error('Error inserting test tenant:', tenantError);
    return;
  }
  
  console.log('Test tenant inserted:', tenantData);

  // 3. Insert test payment
  console.log('Inserting test payment...');

  // First week of January 2023.
  // ISO Week 1 2023 starts Jan 2nd. 
  const testPayment = {
    room_code: 'Apartment 00',
    tenant_name: 'Residente-00',
    amount: 41.00,
    transaction_date: '2023-01-02', 
    week_number: 1,
    year: 2023,
    transaction_type: 'Rent',
    details: 'Initial Test Payment',
    staff_name: 'System'
  };

  const { error: paymentError } = await supabase
    .from('payments')
    .insert(testPayment);

  if (paymentError) {
    console.error('Error inserting test payment:', paymentError);
  } else {
    console.log('Test payment inserted.');
  }

  // Verify fetch with relation
  console.log('Verifying tenant fetch with relations...');
  const { data: verifyData, error: verifyError } = await supabase
    .from('tenants')
    .select('*, rentHistory:tenant_rent_history(*)')
    .eq('sage_id', '000')
    .single();
  
  if (verifyError) {
    console.error('Verification failed (likely missing table):', verifyError);
  } else {
    console.log('Verification successful. Tenant data:', verifyData);
  }

  console.log('Database reset complete.');
}

resetDatabase().catch(console.error);
