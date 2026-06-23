-- ============================================
-- MULTI TALENT: Isolamento por Organização com RLS
-- ============================================

-- 1. Adicionar coluna organization_id na tabela profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS organization_id UUID DEFAULT NULL;

-- 2. Adicionar coluna organization_name para nome da organização
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS organization_name TEXT DEFAULT NULL;

-- 3. Adicionar organization_id nas tabelas de dados (SE existirem)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jobs') THEN
        ALTER TABLE jobs ADD COLUMN IF NOT EXISTS organization_id UUID DEFAULT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vagas_candidaturas') THEN
        ALTER TABLE vagas_candidaturas ADD COLUMN IF NOT EXISTS organization_id UUID DEFAULT NULL;
    END IF;
END $$;

-- 4. Atualizar seu perfil para OWNER
-- (Troque pelo seu email real)
UPDATE profiles 
SET user_role = 'owner', organization_name = 'Usabit people'
WHERE email = 'fabrycio.bermude@usabit.com.br';

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS nas tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes antes de recriar
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- profiles
    FOR pol IN SELECT policy_name FROM pg_policies WHERE tablename = 'profiles' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policy_name);
    END LOOP;
    
    -- jobs
    FOR pol IN SELECT policy_name FROM pg_policies WHERE tablename = 'jobs' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON jobs', pol.policy_name);
    END LOOP;
    
    -- vagas_candidaturas
    FOR pol IN SELECT policy_name FROM pg_policies WHERE tablename = 'vagas_candidaturas' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON vagas_candidaturas', pol.policy_name);
    END LOOP;
END $$;

-- Política: Usuário pode ver seu próprio perfil
CREATE POLICY "users_can_view_own_profile" ON profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Política: Owner/Admin pode ver todos os perfis da mesma org (ou todos se org_id = NULL)
CREATE POLICY "owner_admin_can_view_org_profiles" ON profiles
    FOR SELECT
    USING (
        -- Owner/Admin com org_id = NULL vê tudo
        (auth.uid() IN (SELECT id FROM profiles WHERE user_role IN ('owner', 'admin') AND organization_id IS NULL))
        OR
        -- Usuário da mesma org vê perfis da org
        (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND organization_id IS NOT NULL))
    );

-- Política: Owner/Admin pode criar/editar perfis
CREATE POLICY "owner_admin_can_manage_profiles" ON profiles
    FOR ALL
    USING (
        auth.uid() IN (SELECT id FROM profiles WHERE user_role IN ('owner', 'admin') AND organization_id IS NULL)
        OR
        (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND organization_id IS NOT NULL))
    );

-- Política para JOBS: Isolar por organização
CREATE POLICY "users_can_view_jobs_of_same_org" ON jobs
    FOR SELECT
    USING (
        -- Owner/Admin com org_id = NULL vê todos os jobs
        (auth.uid() IN (SELECT id FROM profiles WHERE user_role IN ('owner', 'admin') AND organization_id IS NULL))
        OR
        -- Usuário vê jobs da mesma org
        (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND organization_id IS NOT NULL))
        OR
        -- Job sem org_id é público (criado antes da migração)
        organization_id IS NULL
    );

CREATE POLICY "users_can_manage_jobs_of_same_org" ON jobs
    FOR ALL
    USING (
        (auth.uid() IN (SELECT id FROM profiles WHERE user_role IN ('owner', 'admin') AND organization_id IS NULL))
        OR
        (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND organization_id IS NOT NULL))
        OR
        organization_id IS NULL
    );

-- Habilitar RLS em vagas_candidaturas
ALTER TABLE vagas_candidaturas ENABLE ROW LEVEL SECURITY;

-- Política para VAGAS_CANDIDATURAS: Isolar por organização
CREATE POLICY "users_can_view_vagas_candidaturas_of_same_org" ON vagas_candidaturas
    FOR SELECT
    USING (
        (auth.uid() IN (SELECT id FROM profiles WHERE user_role IN ('owner', 'admin') AND organization_id IS NULL))
        OR
        (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND organization_id IS NOT NULL))
        OR
        organization_id IS NULL
    );

CREATE POLICY "users_can_manage_vagas_candidaturas_of_same_org" ON vagas_candidaturas
    FOR ALL
    USING (
        (auth.uid() IN (SELECT id FROM profiles WHERE user_role IN ('owner', 'admin') AND organization_id IS NULL))
        OR
        (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND organization_id IS NOT NULL))
        OR
        organization_id IS NULL
    );

