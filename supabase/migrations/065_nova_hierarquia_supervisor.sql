-- ============================================
-- 065: NOVA HIERARQUIA DE PERFIS
-- Owner → Administrador → Supervisor → {RH, Convidado}
-- ============================================
-- 1. Renomeia 'gestor' → 'administrador'
-- 2. Adiciona 'supervisor' como novo perfil
-- 3. Atualiza RLS policies para incluir os novos perfis

-- ============================================
-- PARTE 1: MIGRAR DADOS EXISTENTES
-- ============================================

UPDATE profiles
SET user_role = 'administrador'
WHERE user_role = 'gestor';

-- ============================================
-- PARTE 2: ATUALIZAR POLICIES DE PROFILES
-- ============================================

DROP POLICY IF EXISTS "profiles: gestor_org" ON profiles;
DROP POLICY IF EXISTS "profiles: gestor_insert" ON profiles;
DROP POLICY IF EXISTS "profiles: gestor_update" ON profiles;

DROP POLICY IF EXISTS "profiles: administrador_select" ON profiles;
DROP POLICY IF EXISTS "profiles: administrador_insert" ON profiles;
DROP POLICY IF EXISTS "profiles: administrador_update" ON profiles;
DROP POLICY IF EXISTS "profiles: administrador_delete" ON profiles;

CREATE POLICY "profiles: administrador_select" ON profiles
    FOR SELECT USING (
        get_my_role() = 'administrador'
        AND organization_id IS NOT DISTINCT FROM get_my_org_id()
    );

CREATE POLICY "profiles: administrador_insert" ON profiles
    FOR INSERT WITH CHECK (
        get_my_role() = 'administrador'
        AND organization_id IS NOT DISTINCT FROM get_my_org_id()
    );

CREATE POLICY "profiles: administrador_update" ON profiles
    FOR UPDATE USING (
        get_my_role() = 'administrador'
        AND organization_id IS NOT DISTINCT FROM get_my_org_id()
    );

CREATE POLICY "profiles: administrador_delete" ON profiles
    FOR DELETE USING (
        get_my_role() = 'administrador'
        AND organization_id IS NOT DISTINCT FROM get_my_org_id()
    );

DROP POLICY IF EXISTS "profiles: supervisor_select" ON profiles;
DROP POLICY IF EXISTS "profiles: supervisor_insert" ON profiles;
DROP POLICY IF EXISTS "profiles: supervisor_update" ON profiles;

CREATE POLICY "profiles: supervisor_select" ON profiles
    FOR SELECT USING (
        get_my_role() = 'supervisor'
        AND organization_id IS NOT DISTINCT FROM get_my_org_id()
    );

CREATE POLICY "profiles: supervisor_insert" ON profiles
    FOR INSERT WITH CHECK (
        get_my_role() = 'supervisor'
        AND organization_id IS NOT DISTINCT FROM get_my_org_id()
    );

CREATE POLICY "profiles: supervisor_update" ON profiles
    FOR UPDATE USING (
        get_my_role() = 'supervisor'
        AND organization_id IS NOT DISTINCT FROM get_my_org_id()
    );

-- ============================================
-- PARTE 3: ATUALIZAR POLICIES DE VAGAS (vagas_white_label)
-- ============================================

DROP POLICY IF EXISTS "vagas: multitenancy_policy" ON vagas_white_label;

CREATE POLICY "vagas: multitenancy_policy" ON vagas_white_label FOR ALL
    USING (
        (get_my_role() = 'owner')
        OR (get_my_role() = 'administrador' AND organization_id IS NOT DISTINCT FROM get_my_org_id())
        OR (get_my_role() IN ('supervisor', 'rh') AND organization_id IS NOT DISTINCT FROM get_my_org_id())
    )
    WITH CHECK (
        (get_my_role() = 'owner')
        OR (get_my_role() IN ('administrador', 'supervisor', 'rh') AND organization_id IS NOT DISTINCT FROM get_my_org_id())
    );

-- ============================================
-- PARTE 4-6: POLICIES DE PIPELINES, COLUMNS, CARDS
-- ============================================

DROP POLICY IF EXISTS "pipelines: org isolation" ON pipelines;

CREATE POLICY "pipelines: org isolation" ON pipelines FOR ALL
    USING (
        (get_my_role() = 'owner')
        OR (get_my_role() = 'administrador' AND (organization_id IS NOT DISTINCT FROM get_my_org_id() OR user_id = auth.uid()))
        OR (get_my_role() IN ('supervisor', 'rh') AND (organization_id IS NOT DISTINCT FROM get_my_org_id() OR user_id = auth.uid()))
    )
    WITH CHECK (
        (get_my_role() = 'owner')
        OR (get_my_role() IN ('administrador', 'supervisor', 'rh') AND (organization_id IS NOT DISTINCT FROM get_my_org_id() OR user_id = auth.uid()))
    );

DROP POLICY IF EXISTS "pipeline_columns: org isolation" ON pipeline_columns;

CREATE POLICY "pipeline_columns: org isolation" ON pipeline_columns FOR ALL
    USING (
        (get_my_role() = 'owner')
        OR (get_my_role() = 'administrador' AND (organization_id IS NOT DISTINCT FROM get_my_org_id() OR user_id = auth.uid()))
        OR (get_my_role() IN ('supervisor', 'rh') AND (organization_id IS NOT DISTINCT FROM get_my_org_id() OR user_id = auth.uid()))
    )
    WITH CHECK (
        (get_my_role() = 'owner')
        OR (get_my_role() IN ('administrador', 'supervisor', 'rh') AND (organization_id IS NOT DISTINCT FROM get_my_org_id() OR user_id = auth.uid()))
    );

DROP POLICY IF EXISTS "pipeline_cards: org isolation" ON pipeline_cards;

CREATE POLICY "pipeline_cards: org isolation" ON pipeline_cards FOR ALL
    USING (
        (get_my_role() = 'owner')
        OR (get_my_role() = 'administrador' AND (organization_id IS NOT DISTINCT FROM get_my_org_id() OR user_id = auth.uid()))
        OR (get_my_role() IN ('supervisor', 'rh') AND (organization_id IS NOT DISTINCT FROM get_my_org_id() OR user_id = auth.uid()))
    )
    WITH CHECK (
        (get_my_role() = 'owner')
        OR (get_my_role() IN ('administrador', 'supervisor', 'rh') AND (organization_id IS NOT DISTINCT FROM get_my_org_id() OR user_id = auth.uid()))
    );

-- ============================================
-- PARTE 7: ATUALIZAR POLICIES DE CANDIDATES
-- ============================================

DROP POLICY IF EXISTS "candidates: multitenancy_policy" ON candidates;

CREATE POLICY "candidates: multitenancy_policy" ON candidates FOR ALL
    USING (
        (get_my_role() = 'owner')
        OR (get_my_role() IN ('administrador', 'supervisor', 'rh') AND (organization_id IS NOT DISTINCT FROM get_my_org_id() OR user_id = auth.uid()))
    )
    WITH CHECK (
        (get_my_role() = 'owner')
        OR (get_my_role() IN ('administrador', 'supervisor', 'rh') AND (organization_id IS NOT DISTINCT FROM get_my_org_id() OR user_id = auth.uid()))
    );

-- ============================================
-- PARTE 8-9: POLICIES DE LOGS (com proteção para coluna faltante)
-- ============================================

DO $$
BEGIN
    -- activity_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
        DROP POLICY IF EXISTS "activity_logs: multitenancy_policy" ON activity_logs;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_logs' AND column_name = 'organization_id') THEN
            CREATE POLICY "activity_logs: multitenancy_policy" ON activity_logs FOR ALL
                USING (
                    (get_my_role() = 'owner')
                    OR (user_id = auth.uid())
                    OR (get_my_role() IN ('administrador', 'supervisor') AND organization_id IS NOT DISTINCT FROM get_my_org_id())
                    OR (get_my_role() = 'rh' AND user_id = auth.uid())
                )
                WITH CHECK (
                    (get_my_role() = 'owner')
                    OR (user_id = auth.uid())
                    OR (get_my_role() IN ('administrador', 'supervisor') AND organization_id IS NOT DISTINCT FROM get_my_org_id())
                    OR (get_my_role() = 'rh' AND user_id = auth.uid())
                );
        ELSE
            CREATE POLICY "activity_logs: multitenancy_policy" ON activity_logs FOR ALL
                USING (
                    (get_my_role() = 'owner')
                    OR (user_id = auth.uid())
                    OR (get_my_role() IN ('administrador', 'supervisor'))
                    OR (get_my_role() = 'rh' AND user_id = auth.uid())
                )
                WITH CHECK (
                    (get_my_role() = 'owner')
                    OR (user_id = auth.uid())
                    OR (get_my_role() IN ('administrador', 'supervisor'))
                    OR (get_my_role() = 'rh' AND user_id = auth.uid())
                );
        END IF;
    END IF;

    -- candidate_screening_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'candidate_screening_logs') THEN
        DROP POLICY IF EXISTS "candidate_screening_logs: multitenancy_policy" ON candidate_screening_logs;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidate_screening_logs' AND column_name = 'organization_id') THEN
            CREATE POLICY "candidate_screening_logs: multitenancy_policy" ON candidate_screening_logs FOR ALL
                USING (
                    (get_my_role() = 'owner')
                    OR (user_id = auth.uid())
                    OR (get_my_role() IN ('administrador', 'supervisor') AND organization_id IS NOT DISTINCT FROM get_my_org_id())
                    OR (get_my_role() = 'rh' AND user_id = auth.uid())
                )
                WITH CHECK (
                    (get_my_role() = 'owner')
                    OR (user_id = auth.uid())
                    OR (get_my_role() IN ('administrador', 'supervisor') AND organization_id IS NOT DISTINCT FROM get_my_org_id())
                    OR (get_my_role() = 'rh' AND user_id = auth.uid())
                );
        ELSE
            CREATE POLICY "candidate_screening_logs: multitenancy_policy" ON candidate_screening_logs FOR ALL
                USING (
                    (get_my_role() = 'owner')
                    OR (user_id = auth.uid())
                    OR (get_my_role() IN ('administrador', 'supervisor'))
                    OR (get_my_role() = 'rh' AND user_id = auth.uid())
                )
                WITH CHECK (
                    (get_my_role() = 'owner')
                    OR (user_id = auth.uid())
                    OR (get_my_role() IN ('administrador', 'supervisor'))
                    OR (get_my_role() = 'rh' AND user_id = auth.uid())
                );
        END IF;
    END IF;

    -- screening_logs (plural)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screening_logs') THEN
        DROP POLICY IF EXISTS "screening_logs: multitenancy_policy" ON screening_logs;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'screening_logs' AND column_name = 'organization_id') THEN
            CREATE POLICY "screening_logs: multitenancy_policy" ON screening_logs FOR ALL
                USING (
                    (get_my_role() = 'owner')
                    OR (user_id = auth.uid())
                    OR (get_my_role() IN ('administrador', 'supervisor') AND organization_id IS NOT DISTINCT FROM get_my_org_id())
                    OR (get_my_role() = 'rh' AND user_id = auth.uid())
                )
                WITH CHECK (
                    (get_my_role() = 'owner')
                    OR (user_id = auth.uid())
                    OR (get_my_role() IN ('administrador', 'supervisor') AND organization_id IS NOT DISTINCT FROM get_my_org_id())
                    OR (get_my_role() = 'rh' AND user_id = auth.uid())
                );
        ELSE
            CREATE POLICY "screening_logs: multitenancy_policy" ON screening_logs FOR ALL
                USING (
                    (get_my_role() = 'owner')
                    OR (user_id = auth.uid())
                    OR (get_my_role() IN ('administrador', 'supervisor'))
                    OR (get_my_role() = 'rh' AND user_id = auth.uid())
                )
                WITH CHECK (
                    (get_my_role() = 'owner')
                    OR (user_id = auth.uid())
                    OR (get_my_role() IN ('administrador', 'supervisor'))
                    OR (get_my_role() = 'rh' AND user_id = auth.uid())
                );
        END IF;
    END IF;
END $$;

-- ============================================
-- PARTE 10: ATUALIZAR POLICIES DE VAGAS CANDIDATURAS
-- ============================================

DROP POLICY IF EXISTS "vagas_candidaturas: multitenancy_policy" ON vagas_candidaturas;

CREATE POLICY "vagas_candidaturas: multitenancy_policy" ON vagas_candidaturas FOR ALL
    USING (
        (get_my_role() = 'owner')
        OR (get_my_role() IN ('administrador', 'supervisor', 'rh') AND (organization_id IS NOT DISTINCT FROM get_my_org_id()))
    )
    WITH CHECK (
        (get_my_role() = 'owner')
        OR (get_my_role() IN ('administrador', 'supervisor', 'rh') AND (organization_id IS NOT DISTINCT FROM get_my_org_id()))
    );

-- ============================================
-- PARTE 11: ATUALIZAR POLICIES DE CONVIDADO_VAGA_ACCESS
-- ============================================

DROP POLICY IF EXISTS "cva_gestor_select" ON convidado_vaga_access;
DROP POLICY IF EXISTS "cva_gestor_insert" ON convidado_vaga_access;
DROP POLICY IF EXISTS "cva_gestor_delete" ON convidado_vaga_access;
DROP POLICY IF EXISTS "cva_admin_select" ON convidado_vaga_access;
DROP POLICY IF EXISTS "cva_admin_insert" ON convidado_vaga_access;
DROP POLICY IF EXISTS "cva_admin_delete" ON convidado_vaga_access;

CREATE POLICY "cva_admin_select" ON convidado_vaga_access
    FOR SELECT USING (
        get_my_role() IN ('owner', 'administrador', 'supervisor')
        AND convidado_user_id IN (
            SELECT id FROM profiles
            WHERE organization_id = get_my_org_id()
        )
    );

CREATE POLICY "cva_admin_insert" ON convidado_vaga_access
    FOR INSERT WITH CHECK (
        get_my_role() IN ('owner', 'administrador', 'supervisor')
        AND EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = convidado_user_id
            AND p.organization_id = get_my_org_id()
        )
        AND EXISTS (
            SELECT 1 FROM vagas_white_label v
            WHERE v.id = vaga_id
            AND v.organization_id = get_my_org_id()
        )
    );

CREATE POLICY "cva_admin_delete" ON convidado_vaga_access
    FOR DELETE USING (
        get_my_role() IN ('owner', 'administrador', 'supervisor')
        AND convidado_user_id IN (
            SELECT id FROM profiles
            WHERE organization_id = get_my_org_id()
        )
    );

-- ============================================
-- PARTE 12: ATUALIZAR CONSTRAINTS E COMENTÁRIOS
-- ============================================

COMMENT ON COLUMN profiles.user_role IS 'Perfil de acesso: owner, administrador, supervisor, rh, convidado';

-- ============================================
-- VERIFICAÇÃO
-- ============================================

SELECT user_role, COUNT(*) FROM profiles GROUP BY user_role ORDER BY user_role;
