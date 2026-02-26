
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('Checking tenants table...');
  const { data: tenants, error } = await supabase.from('tenants').select('*').limit(1);
  if (error) {
    console.error('Error selecting from tenants:', error.message);
  } else {
    console.log('Tenants table exists. Sample row:', tenants && tenants.length > 0 ? tenants[0] : 'Table empty');
  }

  console.log('Checking tenant_absences table...');
  const { data: absences, error: absError } = await supabase.from('tenant_absences').select('*').limit(1);
  if (absError) {
    console.log('tenant_absences table likely does not exist:', absError.message);
  } else {
    console.log('tenant_absences table exists.');
  }
}

checkSchema();
