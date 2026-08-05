-- ============================================================
-- 103: Remover policies 'gestor' fantasma (M-3 do pentest)
--
-- Problema: role 'gestor' NÃO existe na hierarquia verificada
-- (owner → administrador → supervisor → rh → convidado), mas
-- policies legadas de migrations antigas (008–023) referenciavam
-- get_my_role() = 'gestor'. Drift de contrato: confunde auditorias
-- e viraria vetor se a role fosse atribuída por engano.
--
-- Fix: dropar todas as policies que referenciam 'gestor'.
-- ============================================================

DROP POLICY IF EXISTS "profiles: gestor select" ON public.profiles;
DROP POLICY IF EXISTS "profiles: gestor insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles: gestor update" ON public.profiles;
DROP POLICY IF EXISTS "profiles: gestor delete" ON public.profiles;
DROP POLICY IF EXISTS "profiles: gestor_select" ON public.profiles;
DROP POLICY IF EXISTS "gestores: insert org" ON public.organizations;
DROP POLICY IF EXISTS "gestores: update own org" ON public.organizations;
