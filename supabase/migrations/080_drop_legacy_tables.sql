-- ============================================
-- 080: LIMPEZA FINAL — DROP job_candidates, jobs
-- Fase 3 do plano de remodelagem.
-- ============================================

-- ─── 1. MIGRAR CANDIDATOS ANTIGOS DO POOL ────────────────────────────────────
-- candidates com source IN ('spontaneous', 'manual_add') eram do Pool antigo.
-- Migrar para vagas_candidaturas (vaga_id NULL) para aparecerem no Pool novo.
-- FILTRO: organization_id IS NOT NULL — obrigatório pela CHECK vc_pool_requires_org.
INSERT INTO public.vagas_candidaturas (
    vaga_id, organization_id, candidate_id,
    candidate_name, candidate_email, candidate_phone, candidate_location,
    candidate_linkedin, candidate_gender, candidate_age,
    resume_url, resume_file_name,
    address, portfolio, cep, address_number, complement,
    skills, experience, education,
    status, source, analysis,
    viewed_at, tags, raw_text, is_analyzed,
    applied_at
)
SELECT
    NULL,  -- vaga_id NULL = Pool
    c.organization_id,
    c.id,  -- candidate_id (link para o perfil master)
    c.name, c.email, c.phone, c.location,
    c.linkedin, c.gender, c.age,
    c.resume_url, c.resume_file_name,
    c.address, c.portfolio, c.cep, c.address_number, c.complement,
    c.skills, c.experience, c.education,
    COALESCE(c.status, 'pending'),
    c.source,
    c.analysis,
    c.viewed_at, c.tags, c.raw_text, c.is_analyzed,
    c.created_at
FROM public.candidates c
WHERE c.source IN ('spontaneous', 'manual_add')
  AND c.organization_id IS NOT NULL  -- obrigatório pela CHECK vc_pool_requires_org
  AND NOT EXISTS (
      -- Não migrar se já existe candidatura do Pool com mesmo email na mesma org
      SELECT 1 FROM public.vagas_candidaturas vc
      WHERE vc.candidate_email = c.email
        AND vc.organization_id IS NOT DISTINCT FROM c.organization_id
        AND vc.vaga_id IS NULL
  );

-- Logar órfãos com organization_id NULL (não migrados — precisam de correção manual)
DO $$
DECLARE orphan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_count
    FROM public.candidates
    WHERE source IN ('spontaneous', 'manual_add')
      AND organization_id IS NULL;
    IF orphan_count > 0 THEN
        RAISE NOTICE '⚠️ % candidatos do Pool antigo com organization_id NULL — NÃO migrados. Corrigir manualmente.', orphan_count;
    END IF;
END $$;

-- ─── 1.5. MERGE: copiar campos faltantes de candidates para entradas existentes no Pool ──
-- Se já existe entrada no Pool (por email+org) mas sem candidate_id, vincular.
UPDATE public.vagas_candidaturas vc
SET candidate_id = c.id,
    skills = COALESCE(vc.skills, c.skills),
    experience = COALESCE(vc.experience, c.experience),
    education = COALESCE(vc.education, c.education),
    raw_text = COALESCE(vc.raw_text, c.raw_text),
    tags = COALESCE(vc.tags, c.tags),
    analysis = COALESCE(vc.analysis, c.analysis)
FROM public.candidates c
WHERE vc.candidate_email = c.email
  AND vc.organization_id IS NOT DISTINCT FROM c.organization_id
  AND vc.vaga_id IS NULL
  AND vc.candidate_id IS NULL
  AND c.source IN ('spontaneous', 'manual_add');

-- ─── 2. DROP função órfã increment_application_count ─────────────────────────
-- Criada na migration 001 para jobs — agora código morto com body inválido.
DROP FUNCTION IF EXISTS public.increment_application_count() CASCADE;

-- ─── 3. DROP job_candidates ──────────────────────────────────────────────────
DROP TABLE IF EXISTS public.job_candidates CASCADE;

-- ─── 4. DROP jobs ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.jobs CASCADE;

-- ─── 5. LIMPAR CANDIDATOS ANTIGOS DO POOL DE candidates ──────────────────────
-- Após migrar para vagas_candidaturas, remover de candidates os que eram do Pool.
-- Mantém: (a) quem tem candidate_id em vagas_candidaturas, (b) quem já está no Pool por email.
DELETE FROM public.candidates
WHERE source IN ('spontaneous', 'manual_add')
  AND id NOT IN (
      SELECT candidate_id FROM public.vagas_candidaturas WHERE candidate_id IS NOT NULL
  )
  AND NOT EXISTS (
      -- Protege quem já está no Pool por email (merge da seção 1.5 pode não ter setado candidate_id)
      SELECT 1 FROM public.vagas_candidaturas vc
      WHERE vc.candidate_email = candidates.email
        AND vc.organization_id IS NOT DISTINCT FROM candidates.organization_id
        AND vc.vaga_id IS NULL
  );

-- ============================================
-- FIM DA FASE 3
-- Estrutura final:
--   vagas_candidaturas (vaga_id NULL = Pool, vaga_id NOT NULL = Gestão)
--   candidates (Banco de Talentos — perfil master)
--   job_candidates, jobs, job_applications = REMOVIDAS
-- ============================================
