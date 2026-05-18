-- 🚀 MIGRAÇÃO: CORREÇÃO CRÍTICA DE RLS E MULTITENANCY (v2)
-- Resolve erros 403 e falhas de carregamento garantindo a existência de colunas

-- 1. Garantir que as funções de busca sejam resilientes
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(user_role, 'owner') FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Adicionar organization_id onde estiver faltando
DO $$
BEGIN
    -- activity_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_logs' AND column_name = 'organization_id') THEN
            ALTER TABLE activity_logs ADD COLUMN organization_id UUID DEFAULT NULL;
        END IF;
    END IF;

    -- candidate_screening_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'candidate_screening_logs') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidate_screening_logs' AND column_name = 'organization_id') THEN
            ALTER TABLE candidate_screening_logs ADD COLUMN organization_id UUID DEFAULT NULL;
        END IF;
    END IF;
END $$;

-- 3. Corrigir políticas de Vagas (vagas_white_label)
DROP POLICY IF EXISTS "vagas: org isolation" ON vagas_white_label;
DROP POLICY IF EXISTS "vagas: owner_admin full access" ON vagas_white_label;
CREATE POLICY "vagas: multitenancy_policy" ON vagas_white_label FOR ALL
    USING (
        (get_my_role() = 'owner')
        OR (get_my_role() IN ('gestor', 'rh') AND (organization_id IS NOT DISTINCT FROM get_my_org_id()))
    )
    WITH CHECK (
        (get_my_role() = 'owner')
        OR (get_my_role() IN ('gestor', 'rh') AND (organization_id IS NOT DISTINCT FROM get_my_org_id()))
    );

-- 4. Corrigir políticas de Candidatos (candidates)
DROP POLICY IF EXISTS "candidates: org isolation" ON candidates;
DROP POLICY IF EXISTS "candidates: org members" ON candidates;
CREATE POLICY "candidates: multitenancy_policy" ON candidates FOR ALL
    USING (
        (get_my_role() = 'owner')
        OR (get_my_role() IN ('gestor', 'rh') AND (organization_id IS NOT DISTINCT FROM get_my_org_id() OR user_id = auth.uid()))
    )
    WITH CHECK (
        (get_my_role() = 'owner')
        OR (get_my_role() IN ('gestor', 'rh') AND (organization_id IS NOT DISTINCT FROM get_my_org_id() OR user_id = auth.uid()))
    );

-- 5. Corrigir políticas de Logs de Atividade (activity_logs)
DROP POLICY IF EXISTS "logs: own" ON activity_logs;
DROP POLICY IF EXISTS "logs: allow_own_and_org" ON activity_logs;
CREATE POLICY "activity_logs: multitenancy_policy" ON activity_logs FOR ALL
    USING (
        (get_my_role() = 'owner')
        OR (user_id = auth.uid())
        OR (get_my_role() IN ('gestor', 'rh') AND (organization_id IS NOT DISTINCT FROM get_my_org_id()))
    )
    WITH CHECK (
        (get_my_role() = 'owner')
        OR (user_id = auth.uid())
        OR (get_my_role() IN ('gestor', 'rh') AND (organization_id IS NOT DISTINCT FROM get_my_org_id()))
    );

-- 6. Corrigir políticas de Screening Logs (candidate_screening_logs)
DROP POLICY IF EXISTS "screening_logs: org isolation" ON candidate_screening_logs;
DROP POLICY IF EXISTS "screening_logs: owner full" ON candidate_screening_logs;
DROP POLICY IF EXISTS "screening_logs: own" ON candidate_screening_logs;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'candidate_screening_logs') THEN
        CREATE POLICY "candidate_screening_logs: multitenancy_policy" ON candidate_screening_logs FOR ALL
            USING (
                (get_my_role() = 'owner')
                OR (user_id = auth.uid())
                OR (get_my_role() IN ('gestor', 'rh') AND (organization_id IS NOT DISTINCT FROM get_my_org_id()))
            )
            WITH CHECK (
                (get_my_role() = 'owner')
                OR (user_id = auth.uid())
                OR (get_my_role() IN ('gestor', 'rh') AND (organization_id IS NOT DISTINCT FROM get_my_org_id()))
            );
    END IF;
END $$;

-- 7. Corrigir políticas de Screening Logs (v2 - screening_logs sem prefixo)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screening_logs') THEN
        DROP POLICY IF EXISTS "screening_logs: owner full" ON screening_logs;
        DROP POLICY IF EXISTS "screening_logs: own" ON screening_logs;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'screening_logs' AND column_name = 'organization_id') THEN
            ALTER TABLE screening_logs ADD COLUMN organization_id UUID DEFAULT NULL;
        END IF;

        CREATE POLICY "screening_logs: multitenancy_policy" ON screening_logs FOR ALL
            USING (
                (get_my_role() = 'owner')
                OR (user_id = auth.uid())
                OR (get_my_role() IN ('gestor', 'rh') AND (organization_id IS NOT DISTINCT FROM get_my_org_id()))
            )
            WITH CHECK (
                (get_my_role() = 'owner')
                OR (user_id = auth.uid())
                OR (get_my_role() IN ('gestor', 'rh') AND (organization_id IS NOT DISTINCT FROM get_my_org_id()))
            );
    END IF;
END $$;

-- 8. Corrigir políticas de Candidaturas (vagas_candidaturas)
DROP POLICY IF EXISTS "candidaturas: org isolation" ON vagas_candidaturas;
DROP POLICY IF EXISTS "candidaturas: vaga owner" ON vagas_candidaturas;
CREATE POLICY "vagas_candidaturas: multitenancy_policy" ON vagas_candidaturas FOR ALL
    USING (
        (get_my_role() = 'owner')
        OR (get_my_role() IN ('gestor', 'rh') AND (organization_id IS NOT DISTINCT FROM get_my_org_id()))
    )
    WITH CHECK (
        (get_my_role() = 'owner')
        OR (get_my_role() IN ('gestor', 'rh') AND (organization_id IS NOT DISTINCT FROM get_my_org_id()))
    );

-- 9. Garantir que Profiles sempre seja acessível pelo dono do perfil
DROP POLICY IF EXISTS "profiles: own" ON profiles;
DROP POLICY IF EXISTS "profiles: own_access" ON profiles;
CREATE POLICY "profiles: universal_self_access" ON profiles FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
