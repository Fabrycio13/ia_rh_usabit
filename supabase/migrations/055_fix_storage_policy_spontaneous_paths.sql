-- ============================================
-- 055: CORREÇÃO STORAGE RLS - CURRÍCULOS ESPONTÂNEOS
-- Permite que recrutadores vejam currículos de candidatura
-- espontânea (path: resumes/spontaneous/{orgId}/{file})
-- ============================================

-- 1. Corrigir SELECT policy
DROP POLICY IF EXISTS "storage: recruiter access" ON storage.objects;
CREATE POLICY "storage: recruiter access"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'job-applications'
    AND (
        (public.get_my_role() = 'owner')
        OR
        -- Vagas normais: extrai UUID da vaga do path
        EXISTS (
            SELECT 1 FROM public.vagas_white_label v
            WHERE v.id::text = split_part(name, '/', 2)
              AND (v.organization_id = public.get_my_org_id() OR v.user_id = auth.uid())
        )
        OR
        -- Candidatura espontânea: path = resumes/spontaneous/{orgId}/{file}
        (
            split_part(name, '/', 2) = 'spontaneous'
            AND split_part(name, '/', 3) = public.get_my_org_id()::text
        )
    )
);

-- 2. Corrigir DELETE policy (mesma lógica)
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
        (
            split_part(name, '/', 2) = 'spontaneous'
            AND split_part(name, '/', 3) = public.get_my_org_id()::text
        )
    )
);
