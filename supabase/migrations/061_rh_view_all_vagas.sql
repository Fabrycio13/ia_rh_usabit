-- 061: RH visualiza todas as vagas da organizacao (read-only)
-- RH: SELECT por organization_id (ve tudo da org)
-- RH: INSERT/UPDATE/DELETE continua restrito a user_id = auth.uid()
-- Gestor e Owner: inalterados

-- 1. vagas_white_label
DROP POLICY IF EXISTS "vagas: multitenancy_policy" ON vagas_white_label;

CREATE POLICY "vagas: multitenancy_policy" ON vagas_white_label FOR ALL
    USING (
        (get_my_role() = 'owner')
        OR (get_my_role() = 'gestor' AND organization_id IS NOT DISTINCT FROM get_my_org_id())
        OR (get_my_role() = 'rh' AND organization_id IS NOT DISTINCT FROM get_my_org_id())
    )
    WITH CHECK (
        (get_my_role() = 'owner')
        OR (get_my_role() IN ('gestor', 'rh') AND organization_id IS NOT DISTINCT FROM get_my_org_id())
    );
