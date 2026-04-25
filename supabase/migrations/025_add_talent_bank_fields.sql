-- ============================================
-- 025: CAMPOS ADICIONAIS PARA BANCO DE TALENTOS
-- LinkedIn, Endereço e Vínculo com Vaga
-- ============================================

-- 1. Adicionar colunas na tabela candidates
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS linkedin TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. Garantir que job_candidates tenha os campos necessários para tracking
-- (Caso a tabela já exista, o IF NOT EXISTS nas colunas resolve)
ALTER TABLE job_candidates 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Analisado',
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Criar índice para busca por LinkedIn
CREATE INDEX IF NOT EXISTS idx_candidates_linkedin ON candidates(linkedin);

-- 4. Adicionar comentário para documentação
COMMENT ON COLUMN candidates.linkedin IS 'URL do perfil do LinkedIn do candidato';
COMMENT ON COLUMN candidates.address IS 'Endereço completo do candidato';
COMMENT ON COLUMN job_candidates.status IS 'Status do candidato nesta vaga específica (ex: Banco de Talentos, Triagem, etc)';
