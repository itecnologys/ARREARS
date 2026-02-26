-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sage_id text UNIQUE NOT NULL,
  tenant_name text NOT NULL,
  room_code text,
  staff_name text,
  weekly_rent numeric DEFAULT 0,
  start_date date,
  end_date date,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tenant_absences table
CREATE TABLE IF NOT EXISTS tenant_absences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text CHECK (reason IN ('Hospital', 'Respite', 'Custody', 'Travel', 'Other')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create tenant_rent_history table
CREATE TABLE IF NOT EXISTS tenant_rent_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  weekly_rent numeric NOT NULL,
  effective_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_rent_history ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for production)
CREATE POLICY "Enable read access for all users" ON tenants FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON tenants FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON tenants FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON tenants FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON tenant_absences FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON tenant_absences FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON tenant_absences FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON tenant_absences FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON tenant_rent_history FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON tenant_rent_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON tenant_rent_history FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON tenant_rent_history FOR DELETE USING (true);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at
BEFORE UPDATE ON tenants
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
