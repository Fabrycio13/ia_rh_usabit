-- ============================================
-- MIGRATION: Unificação de Company -> Organization Name
-- ============================================

-- 1. Sincronizar dados remanescentes para organization_name
UPDATE profiles 
SET organization_name = company 
WHERE organization_name IS NULL AND company IS NOT NULL;

-- 2. Remover a coluna legada company
ALTER TABLE profiles DROP COLUMN IF EXISTS company;

-- 3. Garantir que organization_id não seja nulo para perfis existentes (se possível)
-- (Opcional, mas ajuda no multi-tenancy)
UPDATE profiles 
SET organization_id = gen_random_uuid() 
WHERE organization_id IS NULL;
