-- ============================================
-- 068: STORAGE RLS — SUPORTE A PATHS ESPONTÂNEOS E MANUAIS
-- Corrige a RLS SELECT do bucket job-applications para aceitar
-- os 3 formatos de path:
--   resumes/<vaga_uuid>/<arquivo>          (candidatura via JobApplication)
--   resumes/spontaneous/<org_uuid>/<arquivo> (candidatura espontânea)
--   resumes/manual/<org_uuid>/<arquivo>     (add manual via PoolAddCandidate)
-- ============================================

-- 1. Garantir que o bucket está privado
UPDATE storage.buckets
SET public = false
WHERE id = 'job-applications';

-- 2. Recriar SELECT policy suportando os 3 formatos
DROP POLICY IF EXISTS "storage: recruiter access" ON storage.objects;

CREATE POLICY "storage: recruiter access"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'job-applications'
    AND (
        (public.get_my_role() = 'owner')
        OR
        -- Path padrão: resumes/<vaga_uuid>/<arquivo>
        EXISTS (
            SELECT 1 FROM public.vagas_white_label v
            WHERE v.id::text = split_part(name, '/', 2)
              AND (v.organization_id = public.get_my_org_id() OR v.user_id = auth.uid())
        )
        OR
        -- Path espontâneo: resumes/spontaneous/<org_uuid>/<arquivo>
        (split_part(name, '/', 2) = 'spontaneous'
         AND split_part(name, '/', 3) = public.get_my_org_id()::text)
        OR
        -- Path manual: resumes/manual/<org_uuid>/<arquivo>
        (split_part(name, '/', 2) = 'manual'
         AND split_part(name, '/', 3) = public.get_my_org_id()::text)
    )
);
