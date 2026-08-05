-- ============================================================
-- 098: Corrigir policy de storage para currículos do Pool (manual_add)
--
-- Bug: candidatos adicionados ao Pool pelo RH (upload manual via
-- get-upload-url) tinham path `resumes/{orgId}/{file}` — mas a
-- policy `storage: recruiter access` só liberava SELECT para:
--   - resumes/manual/{orgId}/...
--   - resumes/spontaneous/{orgId}/...
--   - resumes/{vagaId}/... (seg2 = UUID da vaga, com EXISTS)
--
-- Resultado: seg2 = 'resumes' e seg3 = orgId → policy NEGA o SELECT →
-- createSignedUrl falha → erro "querystring must have required
-- property 'token'" ao tentar analisar candidato do pool sem vaga.
--
-- Fix: liberar SELECT (e DELETE, para gestão) quando seg2 = orgId
-- da própria organização do usuário (paths gerados por get-upload-url
-- quando o RH autenticado anexa currículos sem vaga específica).
-- ============================================================

-- ─── 1. Policy de SELECT: incluir path resumes/{orgId}/... ──────────
DROP POLICY IF EXISTS "storage: recruiter access" ON storage.objects;

CREATE POLICY "storage: recruiter access"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'job-applications'
    AND (
        -- Owner tem acesso total
        (public.get_my_role() = 'owner')
        OR
        -- Gestores/RH veem arquivos de suas próprias vagas
        EXISTS (
            SELECT 1 FROM public.vagas_white_label v
            WHERE v.id::text = split_part(name, '/', 2)
              AND (
                  v.organization_id = public.get_my_org_id()
                  OR v.user_id = auth.uid()
              )
        )
        OR
        -- Candidatura espontânea: path = resumes/spontaneous/{orgId}/{file}
        (split_part(name, '/', 2) = 'spontaneous'
         AND split_part(name, '/', 3) = public.get_my_org_id()::text)
        OR
        -- Upload manual do RH: path = resumes/manual/{orgId}/{file}
        (split_part(name, '/', 2) = 'manual'
         AND split_part(name, '/', 3) = public.get_my_org_id()::text)
        OR
        -- Pool manual_add (get-upload-url sem vaga): path = resumes/{orgId}/{file}
        (split_part(name, '/', 2) = public.get_my_org_id()::text)
    )
);

-- ─── 2. Policy de DELETE: mesma correção (gestão de currículos) ──────
DROP POLICY IF EXISTS "storage: recruiter delete" ON storage.objects;

CREATE POLICY "storage: recruiter delete"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'job-applications'
    AND (
        (public.get_my_role() = 'owner')
        OR
        EXISTS (
            SELECT 1 FROM public.vagas_white_label v
            WHERE v.id::text = split_part(name, '/', 2)
              AND (v.organization_id = public.get_my_org_id() OR v.user_id = auth.uid())
        )
        OR
        (split_part(name, '/', 2) = 'spontaneous'
         AND split_part(name, '/', 3) = public.get_my_org_id()::text)
        OR
        (split_part(name, '/', 2) = 'manual'
         AND split_part(name, '/', 3) = public.get_my_org_id()::text)
        OR
        (split_part(name, '/', 2) = public.get_my_org_id()::text)
    )
);

-- ============================================================
-- FIM
-- ============================================================
