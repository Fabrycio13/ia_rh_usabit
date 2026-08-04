-- ============================================================
-- 091: RLS hardening — restrict policies to authenticated
-- Bug: policies com roles={public} e IS NOT DISTINCT FROM NULL
-- retornam TRUE para anon, vazando PII.
-- Fix: adicionar TO authenticated em policies existentes,
-- combinado com a deny policy da 090, anon fica blocked.
-- ============================================================

-- ─── candidates ────────────────────────────────────────────────
-- (1) multitenancy_policy — recriar com TO authenticated
DROP POLICY IF EXISTS "candidates: multitenancy_policy" ON candidates;
CREATE POLICY "candidates: multitenancy_policy"
ON candidates FOR ALL
TO authenticated
USING (
    (get_my_role() = 'owner')
    OR (get_my_role() = ANY (ARRAY['administrador','supervisor','rh'])
        AND ((NOT (organization_id IS DISTINCT FROM get_my_org_id()))
             OR (user_id = auth.uid())))
)
WITH CHECK (
    (get_my_role() = 'owner')
    OR (get_my_role() = ANY (ARRAY['administrador','supervisor','rh'])
        AND ((NOT (organization_id IS DISTINCT FROM get_my_org_id()))
             OR (user_id = auth.uid())))
);

-- (2) access_v4 — recriar com TO authenticated
DROP POLICY IF EXISTS "candidates_access_v4" ON candidates;
CREATE POLICY "candidates_access_v4"
ON candidates FOR ALL
TO authenticated
USING (
    user_id = auth.uid()
    OR (NOT (organization_id IS DISTINCT FROM get_my_org_id()))
    OR (get_my_role() = 'owner')
)
WITH CHECK (
    user_id = auth.uid()
    OR (NOT (organization_id IS DISTINCT FROM get_my_org_id()))
    OR (get_my_role() = 'owner')
);

-- (3) convidado_select — SELECT only, com TO authenticated
DROP POLICY IF EXISTS "candidates_convidado_select" ON candidates;
CREATE POLICY "candidates_convidado_select"
ON candidates FOR SELECT
TO authenticated
USING (
    get_my_role() = 'convidado'
    AND id IN (
        SELECT candidate_id FROM pipeline_cards
        WHERE pipeline_id IN (
            SELECT id FROM pipelines
            WHERE vaga_id IN (SELECT vaga_id FROM get_convidado_vaga_ids())
        )
    )
);

-- ─── vagas_white_label ──────────────────────────────────────────
-- (4) vagas: multitenancy_policy
DROP POLICY IF EXISTS "vagas: multitenancy_policy" ON vagas_white_label;
CREATE POLICY "vagas: multitenancy_policy"
ON vagas_white_label FOR ALL
TO authenticated
USING (
    (get_my_role() = 'owner')
    OR (get_my_role() = 'administrador' AND (NOT (organization_id IS DISTINCT FROM get_my_org_id())))
    OR (get_my_role() = ANY (ARRAY['supervisor','rh']) AND (NOT (organization_id IS DISTINCT FROM get_my_org_id())))
)
WITH CHECK (
    (get_my_role() = 'owner')
    OR (get_my_role() = ANY (ARRAY['administrador','supervisor','rh']) AND (NOT (organization_id IS DISTINCT FROM get_my_org_id())))
);

-- (5) vagas_access_v4
DROP POLICY IF EXISTS "vagas_access_v4" ON vagas_white_label;
CREATE POLICY "vagas_access_v4"
ON vagas_white_label FOR ALL
TO authenticated
USING (
    user_id = auth.uid()
    OR (NOT (organization_id IS DISTINCT FROM get_my_org_id()))
    OR (get_my_role() = 'owner')
)
WITH CHECK (
    user_id = auth.uid()
    OR (NOT (organization_id IS DISTINCT FROM get_my_org_id()))
    OR (get_my_role() = 'owner')
);

-- (6) vwl_convidado_select
DROP POLICY IF EXISTS "vwl_convidado_select" ON vagas_white_label;
CREATE POLICY "vwl_convidado_select"
ON vagas_white_label FOR SELECT
TO authenticated
USING (
    get_my_role() = 'convidado'
    AND id IN (SELECT vaga_id FROM get_convidado_vaga_ids())
);

-- ─── organizations ─────────────────────────────────────────────
-- Adicionar TO authenticated nas policies legítimas (sem USING true)
-- Mantém as policies que dropei na 090 (USING true).
-- Estas aqui são as que ficaram após a 090.
DROP POLICY IF EXISTS "gestores: insert org" ON organizations;
CREATE POLICY "gestores: insert org"
ON organizations FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT user_role FROM profiles WHERE id = auth.uid()) = 'gestor'
);

DROP POLICY IF EXISTS "gestores: update own org" ON organizations;
CREATE POLICY "gestores: update own org"
ON organizations FOR UPDATE
TO authenticated
USING (
    id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "orgs: members see own" ON organizations;
CREATE POLICY "orgs: members see own"
ON organizations FOR SELECT
TO authenticated
USING (
    id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "orgs: members update own" ON organizations;
CREATE POLICY "orgs: members update own"
ON organizations FOR UPDATE
TO authenticated
USING (
    id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
    id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "orgs: owner full" ON organizations;
CREATE POLICY "orgs: owner full"
ON organizations FOR ALL
TO authenticated
USING (
    (SELECT user_role FROM profiles WHERE id = auth.uid()) = 'owner'
);

-- ─── Verificação pós-apply ─────────────────────────────────────
-- SET ROLE anon;
-- SELECT count(*) FROM candidates;        -- esperado: 0
-- SELECT count(*) FROM organizations;     -- esperado: 0
-- SELECT count(*) FROM vagas_white_label; -- esperado: 0
-- RESET ROLE;
