-- ============================================================
-- 093: Harden candidate_screening_logs RLS
--
-- Issue DF-006: candidate_screening_logs estava exposta para anon.
-- Evidência: policy allow_all_screening com USING (true) e várias
-- policies roles={public}; SET ROLE anon retornou 43 registros.
--
-- A migration remove todas as policies existentes da tabela para
-- evitar que uma policy permissiva esquecida continue combinando
-- por OR com as policies legítimas.
-- ============================================================

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    IF to_regclass('public.candidate_screening_logs') IS NULL THEN
        RETURN;
    END IF;

    ALTER TABLE public.candidate_screening_logs ENABLE ROW LEVEL SECURITY;

    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'candidate_screening_logs'
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON public.candidate_screening_logs',
            policy_record.policyname
        );
    END LOOP;
END $$;

-- Owner: acesso total aos logs.
-- Administrador/Supervisor: somente logs de candidatos da própria organização.
-- RH: somente logs criados pelo próprio usuário.
CREATE POLICY "candidate_screening_logs: authenticated access"
ON public.candidate_screening_logs
FOR ALL
TO authenticated
USING (
    get_my_role() = 'owner'
    OR (
        get_my_role() IN ('administrador', 'supervisor')
        AND EXISTS (
            SELECT 1
            FROM public.candidates AS c
            WHERE c.id = candidate_screening_logs.candidate_id
              AND c.organization_id IS NOT DISTINCT FROM get_my_org_id()
        )
    )
    OR (
        get_my_role() = 'rh'
        AND user_id = auth.uid()
    )
)
WITH CHECK (
    get_my_role() = 'owner'
    OR (
        get_my_role() IN ('administrador', 'supervisor')
        AND EXISTS (
            SELECT 1
            FROM public.candidates AS c
            WHERE c.id = candidate_screening_logs.candidate_id
              AND c.organization_id IS NOT DISTINCT FROM get_my_org_id()
        )
    )
    OR (
        get_my_role() = 'rh'
        AND user_id = auth.uid()
    )
);

-- Convidado: leitura somente dos candidatos vinculados às vagas
-- liberadas para o usuário convidado.
CREATE POLICY "candidate_screening_logs: convidado select"
ON public.candidate_screening_logs
FOR SELECT
TO authenticated
USING (
    get_my_role() = 'convidado'
    AND candidate_id IN (
        SELECT pc.candidate_id
        FROM public.pipeline_cards AS pc
        JOIN public.pipelines AS p
          ON p.id = pc.pipeline_id
        WHERE p.vaga_id IN (
            SELECT vaga_id
            FROM public.get_convidado_vaga_ids()
        )
    )
);
