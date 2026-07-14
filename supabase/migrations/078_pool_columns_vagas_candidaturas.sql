-- ============================================
-- 078: COLUNAS DO POOL EM vagas_candidaturas
-- Extensão da Fase 1 (migration 077) para suportar
-- o Pool de Talentos lendo de vagas_candidaturas.
--
-- Colunas que candidates tem e vagas_candidaturas precisa:
--   viewed_at   — marcar candidato como visto no Pool
--   tags        — filtrar por tags no Pool
--   raw_text    — cache do PDF extraído (PII, nunca expor)
--   is_analyzed — flag se passou pela extração IA
-- ============================================

-- 1. viewed_at: marca quando o candidato foi visualizado no Pool
ALTER TABLE public.vagas_candidaturas ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_vagas_candidaturas_viewed_at
    ON public.vagas_candidaturas(viewed_at);

COMMENT ON COLUMN public.vagas_candidaturas.viewed_at IS
  'Quando o candidato foi visualizado no Pool de Talentos.';

-- 2. tags: array de strings para organização e filtro (igual candidates)
ALTER TABLE public.vagas_candidaturas ADD COLUMN IF NOT EXISTS tags TEXT[];
CREATE INDEX IF NOT EXISTS idx_vagas_candidaturas_tags
    ON public.vagas_candidaturas USING GIN (tags);

COMMENT ON COLUMN public.vagas_candidaturas.tags IS
  'Tags de organização do candidato no Pool (ex: backend, sênior, remoto).';

-- 3. raw_text: texto extraído do PDF (cache para reuso)
-- ATENÇÃO: contém PII (nome, email, telefone, endereço).
--          Nunca logar, retornar em erros ou expor fora da org.
ALTER TABLE public.vagas_candidaturas ADD COLUMN IF NOT EXISTS raw_text TEXT;

COMMENT ON COLUMN public.vagas_candidaturas.raw_text IS
  'Texto completo extraído do PDF (cache). Contém PII — nunca logar ou expor em erros.';

-- 4. is_analyzed: flag se já passou pelo fluxo de extração IA
ALTER TABLE public.vagas_candidaturas ADD COLUMN IF NOT EXISTS is_analyzed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.vagas_candidaturas.is_analyzed IS
  'Indica se o candidato já passou pelo fluxo de extração (gpt-4o-mini).';

-- ============================================
-- FIM DA MIGRATION 078
-- ============================================
