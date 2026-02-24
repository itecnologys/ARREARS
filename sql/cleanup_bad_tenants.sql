-- Script para limpar inquilinos com dados incorretos (lixo) na tabela tenants
-- Remove registros onde o código do quarto NÃO segue o padrão (ex: A01, B12)
-- ou onde o nome do inquilino parece um ID numérico.

-- 1. Verificar o que será deletado (para segurança, execute isso primeiro se quiser conferir)
-- SELECT * FROM tenants 
-- WHERE room_code !~ '^[ABCD]\d{2}$' 
--    OR tenant_name ~ '^\d';

-- 2. Deletar os registros incorretos
DELETE FROM tenants 
WHERE room_code !~ '^[ABCD]\d{2}$'  -- Mantém apenas quartos A01-D99
   OR tenant_name ~ '^\d';          -- Remove nomes que começam com números (ex: 01-24562)

-- 3. Confirmar que restaram apenas os dados corretos
-- SELECT room_code, tenant_name FROM tenants ORDER BY room_code;
