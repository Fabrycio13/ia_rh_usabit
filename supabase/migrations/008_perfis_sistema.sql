-- ============================================
-- MIGRAÇÃO: Sistema de Perfis (Roles)
-- Perfis: admin, rh, gestor, convidado
-- ============================================

-- 1. Garantir que a coluna user_role existe
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS user_role TEXT DEFAULT 'rh';

-- 2. Adicionar constraint para limitar valores válidos
-- Primeiro, atualizar valores inválidos
UPDATE profiles 
SET user_role = 'rh' 
WHERE user_role NOT IN ('admin', 'rh', 'gestor', 'convidado');

-- 3. Adicionar comentário na coluna
COMMENT ON COLUMN profiles.user_role IS 'Perfil de acesso: admin, rh, gestor, convidado';

-- 4. Garantir que status existe
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

UPDATE profiles 
SET status = 'active' 
WHERE status IS NULL;

-- 5. Garantir que account_type existe
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'trial';

UPDATE profiles 
SET account_type = 'trial' 
WHERE account_type IS NULL;

-- 6. Garantir que trial_ends_at existe
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;

-- 7. Índice para performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_role ON profiles(user_role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- 8. Verificar perfis existentes
SELECT 
    user_role, 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'active') as ativos,
    COUNT(*) FILTER (WHERE status = 'inactive') as inativos
FROM profiles 
GROUP BY user_role
ORDER BY total DESC;
