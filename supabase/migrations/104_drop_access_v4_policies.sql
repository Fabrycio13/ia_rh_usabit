-- ============================================================
-- 104: Remover policies access_v4 redundantes e mais permissivas (M-2)
--
-- Problema: candidates/vagas_white_label tinham DUAS policies ALL
-- permissivas: 'multitenancy_policy' (restrita: owner +
-- admin/supervisor/rh com org match) e 'access_v4' (ampla: QUALQUER
-- authenticated — inclusive convidado — com user_id match ou org
-- match). Policies permissivas combinam com OR → a access_v4
-- contornava a restrição de role e dava a convidados UPDATE/DELETE
-- em candidatos da org (deveria ser só SELECT restrito via
-- convidado_select).
--
-- Fix: dropar access_v4 (candidates + vagas_white_label). A
-- multitenancy_policy cobre o acesso legítimo; convidado fica com
-- a policy restrita (SELECT de pipeline compartilhado).
-- ============================================================

DROP POLICY IF EXISTS "candidates_access_v4" ON public.candidates;
DROP POLICY IF EXISTS "vagas_access_v4" ON public.vagas_white_label;
