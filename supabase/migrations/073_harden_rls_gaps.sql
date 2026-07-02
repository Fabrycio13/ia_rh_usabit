-- ============================================
-- 073: Harden RLS gaps
-- 1. job_code_counters: enable RLS (was missing)
-- 2. vagas_candidaturas: drop permissive public INSERT
--    (Edge Functions handle all inserts now)
-- ============================================

-- 1. job_code_counters — never had RLS
ALTER TABLE IF EXISTS public.job_code_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_code_counters: service_role_only" ON public.job_code_counters;
CREATE POLICY "job_code_counters: service_role_only"
ON public.job_code_counters FOR ALL
USING (false)
WITH CHECK (false);
-- This table is only accessed by triggers (generate_vaga_job_code_persistent),
-- never by direct client queries. deny-all is correct.

-- 2. vagas_candidaturas — remove public INSERT bypass
-- Antes: qualquer pessoa com anon key podia inserir direto na tabela
-- Agora: só via Edge Functions (submit-application, submit-candidate)
DROP POLICY IF EXISTS "candidaturas: public insert" ON public.vagas_candidaturas;
