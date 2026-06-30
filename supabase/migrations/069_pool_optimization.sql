-- ============================================
-- 069: OTIMIZAÇÃO DO POOL DE TALENTOS
-- Adiciona colunas para cache de extração de
-- currículos, controle de análise e tags
-- ============================================

-- 1. raw_text: texto extraído do PDF (cache para reuso)
-- ATENÇÃO: contém PII (nome, email, telefone, endereço).
--          Nunca logar, retornar em erros ou expor fora da org.
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS raw_text TEXT;

COMMENT ON COLUMN candidates.raw_text IS 'Texto completo extraído do PDF (cache). Contém PII — nunca logar ou expor em erros.';

-- 2. is_analyzed: flag se já passou pelo fluxo de extração
-- NOT NULL garante que DEFAULT false se aplique inclusive a linhas existentes
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS is_analyzed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN candidates.is_analyzed IS 'Indica se o candidato já passou pelo fluxo de extração (gpt-4o-mini).';

-- 3. tags: array de strings para organização e filtro
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS tags TEXT[];

COMMENT ON COLUMN candidates.tags IS 'Tags de organização do candidato (ex: backend, sênior, remoto).';

-- 4. Índice GIN para busca eficiente por tag (tags @> ARRAY['tag'])
CREATE INDEX IF NOT EXISTS idx_candidates_tags ON candidates USING GIN (tags);
