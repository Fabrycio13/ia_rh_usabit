-- ============================================================
-- 099: Identidade normalizada do candidato master
--
-- Parâmetro de identidade (decisão de design):
--   1º: email_normalizado (lowercase + trim)
--   2º fallback: phone_normalizado (somente dígitos) — cobre
--      currículos sem email extraível
--
-- Colunas GENERATED (nunca dessincronizam) + índices de busca.
-- Índices NÃO-unique: existem duplicatas legadas que precisariam
-- de dedup manual antes de um UNIQUE (ver limpeza abaixo).
-- ============================================================

-- ─── candidates ────────────────────────────────────────────────
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS email_normalizado text
    GENERATED ALWAYS AS (lower(trim(email))) STORED;

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS phone_normalizado text
    GENERATED ALWAYS AS (regexp_replace(coalesce(phone, ''), '\D', '', 'g')) STORED;

CREATE INDEX IF NOT EXISTS idx_candidates_email_norm
  ON public.candidates (email_normalizado, organization_id);

CREATE INDEX IF NOT EXISTS idx_candidates_phone_norm
  ON public.candidates (phone_normalizado, organization_id);

-- ─── vagas_candidaturas ────────────────────────────────────────
ALTER TABLE public.vagas_candidaturas
  ADD COLUMN IF NOT EXISTS candidate_email_normalizado text
    GENERATED ALWAYS AS (lower(trim(candidate_email))) STORED;

ALTER TABLE public.vagas_candidaturas
  ADD COLUMN IF NOT EXISTS candidate_phone_normalizado text
    GENERATED ALWAYS AS (regexp_replace(coalesce(candidate_phone, ''), '\D', '', 'g')) STORED;

CREATE INDEX IF NOT EXISTS idx_vc_candidate_email_norm
  ON public.vagas_candidaturas (candidate_email_normalizado, organization_id);

CREATE INDEX IF NOT EXISTS idx_vc_candidate_phone_norm
  ON public.vagas_candidaturas (candidate_phone_normalizado, organization_id);

-- ─── Limpeza de duplicatas de TESTE (Verônica) ─────────────────
-- 2 masters com mesmo email (case difere) e mesmo telefone:
--   bb4c4739... (VERONICA TESTE 03-06, email +TESTE1+)
--   01349c51... (ALINE MORALES 2, email +teste1+)
-- Mesma pessoa provável, dados de teste. Desvincular candidaturas
-- e remover ambos os masters (não apaga candidaturas — FK SET NULL).
UPDATE public.vagas_candidaturas
  SET candidate_id = NULL
  WHERE candidate_id IN (
    'bb4c4739-9e05-4354-aaa3-d84a86c3c4a8',
    '01349c51-f233-4fb9-b688-f0cfa054def1'
  );

DELETE FROM public.candidates
  WHERE id IN (
    'bb4c4739-9e05-4354-aaa3-d84a86c3c4a8',
    '01349c51-f233-4fb9-b688-f0cfa054def1'
  );
