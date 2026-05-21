-- ============================================
-- 056: CONTROLE DE VISUALIZAÇÃO DE CANDIDATOS
-- Adiciona viewed_at para marcar candidatos como
-- "lidos" (similar a e-mail lido/não lido)
-- ============================================

ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_viewed_at ON candidates(viewed_at);
