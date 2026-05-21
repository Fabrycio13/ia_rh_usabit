-- ============================================
-- 054: COLUNAS FALTANTES DA TABELA CANDIDATES
-- Adiciona colunas que o código usa mas nunca
-- foram criadas via migration (tabela original
-- foi criada manualmente fora do sistema).
-- ============================================

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS skills TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS experience TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS education TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS analysis JSONB;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT FALSE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS interview_eligible BOOLEAN DEFAULT FALSE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_url TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_upload_id UUID;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS vaga_id UUID REFERENCES vagas_white_label(id) ON DELETE SET NULL;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS phone TEXT;

-- Colunas que existem no model mas podem estar faltando
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Comentários para documentação
COMMENT ON COLUMN candidates.status IS 'Status do candidato no banco de talentos';
COMMENT ON COLUMN candidates.skills IS 'Habilidades do candidato (texto separado por vírgula)';
COMMENT ON COLUMN candidates.experience IS 'Experiência profissional do candidato';
COMMENT ON COLUMN candidates.education IS 'Formação acadêmica do candidato';
COMMENT ON COLUMN candidates.analysis IS 'Análise completa da IA (JSONB)';
COMMENT ON COLUMN candidates.score IS 'Pontuação geral do candidato';
COMMENT ON COLUMN candidates.is_blacklisted IS 'Candidato marcado como bloqueado';
COMMENT ON COLUMN candidates.interview_eligible IS 'Candidato apto para entrevista';
COMMENT ON COLUMN candidates.source IS 'Origem do candidato (pdf, excel, talent_bank, public_link)';
COMMENT ON COLUMN candidates.vaga_id IS 'Vaga de origem (candidatura espontânea = null)';
