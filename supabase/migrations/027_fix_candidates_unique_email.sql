-- ============================================
-- 027: GARANTIR UNICIDADE DE EMAIL EM CANDIDATES
-- Necessário para operações de UPSERT (Banco de Talentos)
-- ============================================

-- 1. Remover possíveis duplicatas dentro da mesma organização antes de aplicar a constraint
-- (Mantém apenas o registro mais recente de cada email dentro de cada organização)
DELETE FROM candidates a USING (
      SELECT MIN(ctid) as ctid, email, organization_id 
      FROM candidates 
      GROUP BY email, organization_id HAVING COUNT(*) > 1
) b
WHERE a.email = b.email 
AND a.organization_id = b.organization_id
AND a.ctid > b.ctid;

-- 2. Adicionar a constraint UNIQUE no par (email, organization_id)
-- Isso permite que o mesmo candidato exista em organizações diferentes, mas seja único na sua.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'candidates_email_org_key'
    ) THEN
        ALTER TABLE candidates ADD CONSTRAINT candidates_email_org_key UNIQUE (email, organization_id);
    END IF;
END $$;

COMMENT ON CONSTRAINT candidates_email_org_key ON candidates IS 'Garante que não existam candidatos duplicados por e-mail dentro da mesma organização';
