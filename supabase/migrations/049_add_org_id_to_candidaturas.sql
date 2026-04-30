-- 🚀 MIGRAÇÃO: VÍNCULO DIRETO DE ORGANIZAÇÃO EM CANDIDATURAS
-- Garante que toda candidatura saiba a qual organização pertence desde o início.

-- 1. Adicionar coluna organization_id na tabela vagas_candidaturas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vagas_candidaturas' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE vagas_candidaturas ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        CREATE INDEX idx_vagas_candidaturas_org_id ON vagas_candidaturas(organization_id);
    END IF;
END $$;

-- 2. Retro-alimentar dados existentes baseados na vaga vinculada
UPDATE vagas_candidaturas vc
SET organization_id = v.organization_id
FROM vagas_white_label v
WHERE vc.vaga_id = v.id
AND vc.organization_id IS NULL;

-- 3. Atualizar RLS de vagas_candidaturas para usar a coluna direta (mais performático)
DROP POLICY IF EXISTS "candidaturas: org isolation" ON vagas_candidaturas;

CREATE POLICY "candidaturas: org isolation" ON vagas_candidaturas FOR ALL
    USING (
        (organization_id = get_my_org_id() OR get_my_role() = 'owner')
    )
    WITH CHECK (
        (organization_id = get_my_org_id() OR get_my_role() = 'owner')
    );
-- 4. Retro-alimentar tabela candidates (Banco de Talentos)
-- Se houver candidatos com organization_id NULL, tentamos recuperar via email nas candidaturas
UPDATE candidates c
SET organization_id = vc.organization_id
FROM vagas_candidaturas vc
WHERE c.email = vc.candidate_email
AND c.organization_id IS NULL
AND vc.organization_id IS NOT NULL;
