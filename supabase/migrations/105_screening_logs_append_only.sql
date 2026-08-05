-- ============================================================
-- 105: candidate_screening_logs append-only (pentest #2)
--
-- Mesmo padrão da migration 102 (activity_logs): a policy
-- 'authenticated access' = ALL permitia UPDATE/DELETE em log de
-- triagem (owner, admin, supervisor, rh). Audit trail imutável
-- é requisito LGPD.
--
-- Frontend só faz INSERT (logger.ts:27) e SELECT (CandidatePanel
-- aba Triagem). Split em INSERT own + SELECT; sem UPDATE/DELETE.
-- ============================================================

DROP POLICY IF EXISTS "candidate_screening_logs: authenticated access" ON public.candidate_screening_logs;

-- INSERT: qualquer authenticated loga APENAS a própria ação
CREATE POLICY "candidate_screening_logs: insert own"
    ON public.candidate_screening_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- SELECT: owner tudo; admin/supervisor candidatos da org; rh próprios
CREATE POLICY "candidate_screening_logs: select"
    ON public.candidate_screening_logs
    FOR SELECT
    TO authenticated
    USING (
        (get_my_role() = 'owner')
        OR (
            (get_my_role() = ANY (ARRAY['administrador', 'supervisor']))
            AND EXISTS (
                SELECT 1 FROM public.candidates c
                WHERE c.id = candidate_screening_logs.candidate_id
                  AND c.organization_id IS NOT DISTINCT FROM get_my_org_id()
            )
        )
        OR ((get_my_role() = 'rh') AND (user_id = auth.uid()))
    );

-- Sem policy de UPDATE/DELETE → append-only
