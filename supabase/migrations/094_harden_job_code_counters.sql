-- ============================================================
-- 094: Harden job_code_counters RLS
--
-- Issue DF-008: job_code_counters estava exposta para anon.
-- Evidência: GET /rest/v1/job_code_counters?select=*&limit=3
-- retornou HTTP 200 com linhas reais (organization_id + last_value)
-- de todas as organizações, sem autenticação.
--
-- Causa raiz: além da policy deny-all da migration 073
-- ("job_code_counters: service_role_only"), existia no banco uma
-- policy MANUAL "allow_all_counters" com roles={public} e
-- USING (true) — criada fora do repositório (Dashboard). Como
-- policies permissivas são combinadas por OR, ela liberava o
-- acesso de anon mesmo com a deny-all presente.
--
-- Correção (padrão da migration 093):
--   - remove TODAS as policies existentes da tabela (inclusive
--     as criadas manualmente fora do repo);
--   - habilita RLS;
--   - recria acesso somente para `authenticated`, restrito à
--     própria organização (organization_id = get_my_org_id());
--   - nega explicitamente `anon`.
--   - O trigger generate_vaga_job_code_persistent() (migration
--     051) continua funcionando: usuários autenticados criando
--     vagas passam pelo WITH CHECK (org do usuário = org da vaga);
--     service_role (Edge Functions) bypassa RLS.
-- ============================================================

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    IF to_regclass('public.job_code_counters') IS NULL THEN
        RETURN;
    END IF;

    ALTER TABLE public.job_code_counters ENABLE ROW LEVEL SECURITY;

    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'job_code_counters'
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON public.job_code_counters',
            policy_record.policyname
        );
    END LOOP;
END $$;

-- Acesso autenticado restrito à própria organização
-- (cobre SELECT e também INSERT/UPDATE do trigger de job_code).
CREATE POLICY "job_code_counters: org scope"
ON public.job_code_counters
FOR ALL
TO authenticated
USING (
    organization_id IS NOT DISTINCT FROM get_my_org_id()
)
WITH CHECK (
    organization_id IS NOT DISTINCT FROM get_my_org_id()
);

-- Deny explícito para anon (defesa em profundidade, padrão 090/091)
CREATE POLICY "job_code_counters: deny anon"
ON public.job_code_counters
FOR ALL
TO anon
USING (false)
WITH CHECK (false);
