-- Tabela para armazenar os pagamentos/transações
CREATE TABLE IF NOT EXISTS payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code text,
  tenant_name text,
  amount numeric,
  transaction_no text,
  transaction_date date,
  reference text,
  transaction_type text,
  details text,
  staff_name text,
  week_number integer,
  year integer,
  created_at timestamptz DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Política para leitura pública (ajuste conforme necessário)
CREATE POLICY "Enable read access for all users" ON payments
  FOR SELECT USING (true);

-- Política para inserção (apenas autenticados ou service role)
-- Você pode precisar ajustar isso dependendo de como vai inserir os dados
CREATE POLICY "Enable insert for authenticated users only" ON payments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
