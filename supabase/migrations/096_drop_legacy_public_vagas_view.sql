-- ============================================================
-- 096: Remover view legada public_vagas
--
-- A view public_vagas é resquício da migration 007 (portal lia
-- via REST direto). Hoje NADA usa: nem src/ nem Edge Functions
-- (public-jobs/public-job-detail consultam vagas_white_label
-- direto com service_role + filtro organization_id).
--
-- Risco: view com owner=postgres (ignora RLS) + SELECT grant
-- para anon → qualquer pessoa via REST /rest/v1/public_vagas
-- enxergava vagas de TODAS as organizações.
--
-- Fix: DROP da view (código morto + risco removido). O portal
-- público continua funcionando via Edge Functions.
-- ============================================================

DROP VIEW IF EXISTS public.public_vagas;

-- ============================================================
-- FIM
-- ============================================================
