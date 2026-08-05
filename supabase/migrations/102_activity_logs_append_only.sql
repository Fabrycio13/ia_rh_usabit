-- ============================================================
-- 102: activity_logs append-only (M-1 do pentest)
--
-- Problema: policy 'activity_logs: multitenancy_policy' = ALL
-- permitia UPDATE/DELETE em audit trail (owner, admin, supervisor
-- e o próprio usuário podiam apagar/alterar logs). Audit trail
-- imutável é requisito LGPD.
--
-- Fix: split em INSERT (append-only) + SELECT (leitura com as
-- mesmas condições de tenant). SEM policy de UPDATE/DELETE →
-- qualquer tentativa de alterar/apagar log é negada pelo RLS.
-- ============================================================

DROP POLICY IF EXISTS "activity_logs: multitenancy_policy" ON public.activity_logs;

-- INSERT: qualquer authenticated loga APENAS a própria ação
-- (user_id = auth.uid() impede forjar log em nome de outro)
CREATE POLICY "activity_logs: insert own"
    ON public.activity_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- SELECT: owner vê tudo; admin/supervisor vêem a org;
-- rh vê apenas os próprios logs
CREATE POLICY "activity_logs: select"
    ON public.activity_logs
    FOR SELECT
    TO authenticated
    USING (
        (get_my_role() = 'owner')
        OR (user_id = auth.uid())
        OR (
            (get_my_role() = ANY (ARRAY['administrador', 'supervisor']))
            AND (organization_id IS NOT DISTINCT FROM get_my_org_id())
        )
    );

-- Sem policy de UPDATE/DELETE → append-only (imutável)
