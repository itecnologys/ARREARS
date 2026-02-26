
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

async function checkSchema() {
  // Check tenants table
  const { data: tenants, error } = await supabase.from('tenants').select('*').limit(1);
  if (error) {
    console.error('Error selecting from tenants:', error);
  } else {
    console.log('Tenants table exists. Sample row:', tenants[0]);
    // Try to infer columns from the row if it exists, or just we know it exists.
  }

  // Check if tenant_absences exists
  const { data: absences, error: absError } = await supabase.from('tenant_absences').select('*').limit(1);
  if (absError) {
    console.log('tenant_absences table likely does not exist:', absError.message);
  } else {
    console.log('tenant_absences table exists.');
  }
}

checkSchema();
