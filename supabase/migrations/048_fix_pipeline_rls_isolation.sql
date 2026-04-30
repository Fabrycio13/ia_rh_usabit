-- 🚀 FIX: Atualizar RLS de Pipelines para suporte multitenant (mesma organização)
-- Resolve o problema onde pipelines criados por um usuário não eram vistos por outros da mesma empresa.

-- 1. Pipelines
DROP POLICY IF EXISTS "pipelines: own" ON pipelines;
DROP POLICY IF EXISTS "pipelines: owner full" ON pipelines;

CREATE POLICY "pipelines: org isolation" ON pipelines FOR ALL
    USING (
        (get_my_role() IN ('gestor', 'rh') AND (organization_id = get_my_org_id() OR user_id = auth.uid()))
        OR (get_my_role() = 'owner')
    )
    WITH CHECK (
        (get_my_role() IN ('gestor', 'rh') AND (organization_id = get_my_org_id() OR user_id = auth.uid()))
        OR (get_my_role() = 'owner')
    );

-- 2. Pipeline Columns
DROP POLICY IF EXISTS "pipeline_columns: own" ON pipeline_columns;
DROP POLICY IF EXISTS "pipeline_columns: owner full" ON pipeline_columns;

CREATE POLICY "pipeline_columns: org isolation" ON pipeline_columns FOR ALL
    USING (
        (get_my_role() IN ('gestor', 'rh') AND (organization_id = get_my_org_id() OR user_id = auth.uid()))
        OR (get_my_role() = 'owner')
    )
    WITH CHECK (
        (get_my_role() IN ('gestor', 'rh') AND (organization_id = get_my_org_id() OR user_id = auth.uid()))
        OR (get_my_role() = 'owner')
    );

-- 3. Pipeline Cards
DROP POLICY IF EXISTS "pipeline_cards: own" ON pipeline_cards;
DROP POLICY IF EXISTS "pipeline_cards: owner full" ON pipeline_cards;

CREATE POLICY "pipeline_cards: org isolation" ON pipeline_cards FOR ALL
    USING (
        (get_my_role() IN ('gestor', 'rh') AND (organization_id = get_my_org_id() OR user_id = auth.uid()))
        OR (get_my_role() = 'owner')
    )
    WITH CHECK (
        (get_my_role() IN ('gestor', 'rh') AND (organization_id = get_my_org_id() OR user_id = auth.uid()))
        OR (get_my_role() = 'owner')
    );
