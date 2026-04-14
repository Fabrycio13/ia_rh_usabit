-- ============================================
-- 027: AJUSTE FINO RLS PROFILES
-- Permissões explícitas para Gestores gerenciarem equipe
-- ============================================

-- 1. Remover polícias antigas do gestor para evitar conflitos
DROP POLICY IF EXISTS "profiles: gestor manages org" ON profiles;
DROP POLICY IF EXISTS "profiles: gestor sees org" ON profiles;

-- 2. Política de LEITURA: Gestor vê membros da sua org
CREATE POLICY "profiles: gestor select"
    ON profiles FOR SELECT
    USING (
        get_my_role() = 'gestor'
        AND organization_id = get_my_org_id()
    );

-- 3. Política de INSERÇÃO: Gestor pode inserir novos membros
-- IMPORTANTE: Permite inserir se a nova linha tiver o mesmo organization_id do gestor
CREATE POLICY "profiles: gestor insert"
    ON profiles FOR INSERT
    WITH CHECK (
        get_my_role() = 'gestor'
        AND organization_id = get_my_org_id()
    );

-- 4. Política de ATUALIZAÇÃO: Gestor pode editar membros da sua org
CREATE POLICY "profiles: gestor update"
    ON profiles FOR UPDATE
    USING (
        get_my_role() = 'gestor'
        AND organization_id = get_my_org_id()
    )
    WITH CHECK (
        get_my_role() = 'gestor'
        AND organization_id = get_my_org_id()
    );

-- 5. Política de EXCLUSÃO: Gestor pode remover membros da sua org
CREATE POLICY "profiles: gestor delete"
    ON profiles FOR DELETE
    USING (
        get_my_role() = 'gestor'
        AND organization_id = get_my_org_id()
    );

-- OBSERVAÇÃO: A política "profiles: own" (auth.uid() = id) continua ativa
-- permitindo que cada usuário edite seus próprios dados básicos.
