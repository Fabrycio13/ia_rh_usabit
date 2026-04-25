-- ============================================
-- 028: VÍNCULO JOB_CANDIDATES COM VAGAS_WHITE_LABEL
-- Permite que candidatos no banco de talentos saibam de qual vaga vieram
-- ============================================

-- 1. Adicionar coluna vaga_id na tabela job_candidates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'job_candidates' AND column_name = 'vaga_id'
    ) THEN
        ALTER TABLE job_candidates ADD COLUMN vaga_id UUID REFERENCES vagas_white_label(id) ON DELETE CASCADE;
        CREATE INDEX idx_job_candidates_vaga_id ON job_candidates(vaga_id);
        COMMENT ON COLUMN job_candidates.vaga_id IS 'Vaga do portal white label associada a este candidato';
    END IF;
END $$;

-- 2. Atualizar RLS para permitir leitura/escrita com vaga_id
-- (As políticas existentes em 013 já cobrem ALL para owner/gestor, mas é bom garantir)
