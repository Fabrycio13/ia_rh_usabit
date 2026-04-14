-- ============================================
-- FIX: Atribuir Organização ao Owner
-- ============================================

-- Este script garante que o seu perfil tenha um organization_id válido
-- para que os filtros do Dashboard e permissões funcionem perfeitamente.

UPDATE profiles 
SET 
    organization_id = gen_random_uuid(),
    organization_name = 'Sua Organização' 
WHERE 
    email = 'fabrycio.bermudes@usabit.com.br' 
    AND (organization_id IS NULL OR organization_name IS NULL);
