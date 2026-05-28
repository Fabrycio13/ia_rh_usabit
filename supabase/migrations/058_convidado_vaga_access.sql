-- 058: Permissao granular de vagas para convidados
-- Gestor pode selecionar quais vagas um convidado pode ver

-- 1. Tabela de permissao
CREATE TABLE convidado_vaga_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    convidado_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    vaga_id UUID NOT NULL REFERENCES vagas_white_label(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(convidado_user_id, vaga_id)
);

CREATE INDEX idx_cva_convidado ON convidado_vaga_access(convidado_user_id);
CREATE INDEX idx_cva_vaga ON convidado_vaga_access(vaga_id);

ALTER TABLE convidado_vaga_access ENABLE ROW LEVEL SECURITY;

-- Gestor/owner: SELECT
CREATE POLICY "cva_gestor_select" ON convidado_vaga_access
    FOR SELECT USING (
        get_my_role() IN ('owner', 'gestor')
        AND convidado_user_id IN (
            SELECT id FROM profiles
            WHERE organization_id = get_my_org_id()
        )
    );

-- Gestor/owner: INSERT
CREATE POLICY "cva_gestor_insert" ON convidado_vaga_access
    FOR INSERT WITH CHECK (
        get_my_role() IN ('owner', 'gestor')
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

-- Gestor/owner: DELETE
CREATE POLICY "cva_gestor_delete" ON convidado_vaga_access
    FOR DELETE USING (
        get_my_role() IN ('owner', 'gestor')
        AND convidado_user_id IN (
            SELECT id FROM profiles
            WHERE organization_id = get_my_org_id()
        )
    );

-- Convidado: SELECT apenas proprios registros
CREATE POLICY "cva_convidado_select" ON convidado_vaga_access
    FOR SELECT USING (
        convidado_user_id = auth.uid()
    );

-- Helper function segura: retorna vaga_ids que o convidado atual pode ver
CREATE OR REPLACE FUNCTION get_convidado_vaga_ids()
RETURNS TABLE (vaga_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT vaga_id FROM convidado_vaga_access
    WHERE convidado_user_id = auth.uid();
$$;

-- 2. RLS: vagas_white_label
CREATE POLICY "vwl_convidado_select" ON vagas_white_label
    FOR SELECT USING (
        get_my_role() = 'convidado'
        AND id IN (SELECT vaga_id FROM get_convidado_vaga_ids())
    );

-- 3. RLS: pipelines
CREATE POLICY "pipelines_convidado_select" ON pipelines
    FOR SELECT USING (
        get_my_role() = 'convidado'
        AND vaga_id IN (SELECT vaga_id FROM get_convidado_vaga_ids())
    );

-- 4. RLS: pipeline_columns
CREATE POLICY "pcols_convidado_select" ON pipeline_columns
    FOR SELECT USING (
        get_my_role() = 'convidado'
        AND pipeline_id IN (
            SELECT id FROM pipelines
            WHERE vaga_id IN (SELECT vaga_id FROM get_convidado_vaga_ids())
        )
    );

-- 5. RLS: pipeline_cards
CREATE POLICY "pcards_convidado_select" ON pipeline_cards
    FOR SELECT USING (
        get_my_role() = 'convidado'
        AND pipeline_id IN (
            SELECT id FROM pipelines
            WHERE vaga_id IN (SELECT vaga_id FROM get_convidado_vaga_ids())
        )
    );

-- 6. RLS: vagas_candidaturas
CREATE POLICY "vc_convidado_select" ON vagas_candidaturas
    FOR SELECT USING (
        get_my_role() = 'convidado'
        AND vaga_id IN (SELECT vaga_id FROM get_convidado_vaga_ids())
    );

-- 7. RLS: candidates (via pipeline_cards)
CREATE POLICY "candidates_convidado_select" ON candidates
    FOR SELECT USING (
        get_my_role() = 'convidado'
        AND id IN (
            SELECT candidate_id FROM pipeline_cards
            WHERE pipeline_id IN (
                SELECT id FROM pipelines
                WHERE vaga_id IN (SELECT vaga_id FROM get_convidado_vaga_ids())
            )
        )
    );

-- 8. RLS: candidate_screening_logs (para CandidatePanel > Triagem)
CREATE POLICY "csl_convidado_select" ON candidate_screening_logs
    FOR SELECT USING (
        get_my_role() = 'convidado'
        AND candidate_id IN (
            SELECT id FROM candidates
            WHERE id IN (
                SELECT candidate_id FROM pipeline_cards
                WHERE pipeline_id IN (
                    SELECT id FROM pipelines
                    WHERE vaga_id IN (SELECT vaga_id FROM get_convidado_vaga_ids())
                )
            )
        )
    );
