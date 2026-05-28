-- 059: Isolamento de dados entre Gestor e RH
-- Gestor: acesso por organization_id (vê tudo da org)
-- RH: acesso por user_id (vê apenas o que criou)
-- Owner: vê tudo (inalterado)
-- Convidado: policies separadas (058) permanecem intactas

-- 1. vagas_white_label
DROP POLICY IF EXISTS "vagas: multitenancy_policy" ON vagas_white_label;

CREATE POLICY "vagas: multitenancy_policy" ON vagas_white_label FOR ALL
    USING (
        (get_my_role() = 'owner')
        OR (get_my_role() = 'gestor' AND organization_id IS NOT DISTINCT FROM get_my_org_id())
        OR (get_my_role() = 'rh' AND user_id = auth.uid())
    )
    WITH CHECK (
        (get_my_role() = 'owner')
        OR (get_my_role() IN ('gestor', 'rh') AND organization_id IS NOT DISTINCT FROM get_my_org_id())
    );

-- 2. pipelines
DROP POLICY IF EXISTS "pipelines: org isolation" ON pipelines;

CREATE POLICY "pipelines: org isolation" ON pipelines FOR ALL
    USING (
        (get_my_role() = 'owner')
        OR (get_my_role() = 'gestor' AND (organization_id IS NOT DISTINCT FROM get_my_org_id() OR user_id = auth.uid()))
        OR (get_my_role() = 'rh' AND user_id = auth.uid())
    )
    WITH CHECK (
        (get_my_role() = 'owner')
        OR (get_my_role() IN ('gestor', 'rh') AND (organization_id IS NOT DISTINCT FROM get_my_org_id() OR user_id = auth.uid()))
    );

-- 3. pipeline_columns
DROP POLICY IF EXISTS "pipeline_columns: org isolation" ON pipeline_columns;

CREATE POLICY "pipeline_columns: org isolation" ON pipeline_columns FOR ALL
    USING (
        (get_my_role() = 'owner')
        OR (get_my_role() = 'gestor' AND (organization_id IS NOT DISTINCT FROM get_my_org_id() OR user_id = auth.uid()))
        OR (get_my_role() = 'rh' AND user_id = auth.uid())
    )
    WITH CHECK (
        (get_my_role() = 'owner')
        OR (get_my_role() IN ('gestor', 'rh') AND (organization_id IS NOT DISTINCT FROM get_my_org_id() OR user_id = auth.uid()))
    );

-- 4. pipeline_cards
DROP POLICY IF EXISTS "pipeline_cards: org isolation" ON pipeline_cards;

CREATE POLICY "pipeline_cards: org isolation" ON pipeline_cards FOR ALL
    USING (
        (get_my_role() = 'owner')
        OR (get_my_role() = 'gestor' AND (organization_id IS NOT DISTINCT FROM get_my_org_id() OR user_id = auth.uid()))
        OR (get_my_role() = 'rh' AND user_id = auth.uid())
    )
    WITH CHECK (
        (get_my_role() = 'owner')
        OR (get_my_role() IN ('gestor', 'rh') AND (organization_id IS NOT DISTINCT FROM get_my_org_id() OR user_id = auth.uid()))
    );
