-- ============================================================
-- MIGRAÇÃO DEFINITIVA: RLS Seguro para tabela profiles
-- Resolve o problema de recursividade usando SECURITY DEFINER
-- ============================================================

-- 1. Garante que RLS está desativado antes de limpar tudo
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. Remove TODAS as políticas existentes de profiles (limpeza total)
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public' 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
    END LOOP;
END $$;

-- 3. Garante que a função helper existe e é SECURITY DEFINER
-- (isso evita recursão: ela ignora o RLS ao consultar profiles)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT user_role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 4. Cria as políticas corretas e sem recursão

-- Todo usuário pode ver e editar seu próprio perfil
CREATE POLICY "profiles: own" 
    ON profiles FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Owner vê e gerencia TODOS os perfis (usa SECURITY DEFINER, sem recursão)
CREATE POLICY "profiles: owner_full"
    ON profiles FOR ALL
    USING (get_my_role() = 'owner')
    WITH CHECK (get_my_role() = 'owner');

-- Gestor vê apenas os perfis da sua organização
CREATE POLICY "profiles: gestor_org"
    ON profiles FOR SELECT
    USING (
        get_my_role() = 'gestor'
        AND organization_id = get_my_org_id()
    );

-- Gestor pode inserir novos membros na sua organização
CREATE POLICY "profiles: gestor_insert"
    ON profiles FOR INSERT
    WITH CHECK (
        get_my_role() = 'gestor'
    );

-- Gestor pode atualizar membros da sua organização
CREATE POLICY "profiles: gestor_update"
    ON profiles FOR UPDATE
    USING (
        get_my_role() = 'gestor'
        AND organization_id = get_my_org_id()
    );

-- 5. Reativa o RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 6. Verifica o resultado
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY policyname;
