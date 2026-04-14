-- 🚀 MIGRAÇÃO: ISOLAMENTO TOTAL DE MULTITENANCY
-- Este script garante que gestores e RHs só vejam dados da sua própria organização.

-- 1. Limpar políticas antigas que causavam o vazamento
DROP POLICY IF EXISTS "vagas: public active" ON vagas_white_label;
DROP POLICY IF EXISTS "vagas: org members" ON vagas_white_label;
DROP POLICY IF EXISTS "candidates: org members" ON candidates;
DROP POLICY IF EXISTS "candidaturas: vaga owner" ON vagas_candidaturas;

-- 2. Tabela: VAGAS_WHITE_LABEL
-- Gestores e RH: Acesso TOTAL e APENAS na sua organização
CREATE POLICY "vagas: org isolation" ON vagas_white_label FOR ALL
    USING (
        (get_my_role() IN ('gestor', 'rh') AND organization_id = get_my_org_id())
        OR (get_my_role() = 'owner') -- Owner continua vendo tudo
    )
    WITH CHECK (
        (get_my_role() IN ('gestor', 'rh') AND organization_id = get_my_org_id())
        OR (get_my_role() = 'owner')
    );

-- Candidatos (Público): Podem ver apenas se a vaga estiver ativa e aceitando inscrições
CREATE POLICY "vagas: public candidate access" ON vagas_white_label FOR SELECT
    USING (
        is_active = true 
        AND is_accepting_applications = true
    );

-- 3. Tabela: CANDIDATES
-- Isolamento absoluto por organização
CREATE POLICY "candidates: org isolation" ON candidates FOR ALL
    USING (
        (get_my_role() IN ('gestor', 'rh') AND (organization_id = get_my_org_id() OR user_id = auth.uid()))
        OR (get_my_role() = 'owner')
    )
    WITH CHECK (
        (get_my_role() IN ('gestor', 'rh') AND (organization_id = get_my_org_id() OR user_id = auth.uid()))
        OR (get_my_role() = 'owner')
    );

-- 4. Tabela: VAGAS_CANDIDATURAS
-- Só pode ver se a vaga vinculada pertence à sua organização
CREATE POLICY "candidaturas: org isolation" ON vagas_candidaturas FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM vagas_white_label v
            WHERE v.id = vagas_candidaturas.vaga_id
            AND (v.organization_id = get_my_org_id() OR get_my_role() = 'owner')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM vagas_white_label v
            WHERE v.id = vagas_candidaturas.vaga_id
            AND (v.organization_id = get_my_org_id() OR get_my_role() = 'owner')
        )
    );
