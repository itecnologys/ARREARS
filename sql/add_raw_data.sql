
-- Adicionar coluna raw_data para armazenar dados brutos de qualquer formato de importação
ALTER TABLE payments ADD COLUMN IF NOT EXISTS raw_data jsonb;

-- Garantir que transaction_date possa aceitar null temporariamente se não conseguirmos parsear
ALTER TABLE payments ALTER COLUMN transaction_date DROP NOT NULL;
