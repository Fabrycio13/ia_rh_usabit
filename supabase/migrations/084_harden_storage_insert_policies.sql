-- ============================================
-- 084: Remove policies de INSERT abertas nos buckets
-- Contexto: get-upload-url agora gera path server-side,
-- então INSERT direto ao bucket não é mais necessário.
-- ============================================

-- 1. Bucket resumes: remover INSERT aberto
-- Uploads internos agora passam pela EF get-upload-url
-- que gera path scoped por organização e usa signed URL
DROP POLICY IF EXISTS "storage: org resumes insert" ON storage.objects;
DROP POLICY IF EXISTS "resumes insert" ON storage.objects;

-- 2. Bucket job-applications: restringir INSERT
-- Signed URLs ainda precisam de INSERT, mas só para paths
-- que seguem o padrão gerado pela EF:
--   resumes/{jobId ou orgId}/{timestamp}_{uuid ou "secure"}.pdf
-- ou espontâneo: resumes/spontaneous/{orgId}/{...}.pdf
--
-- Como SQL de RLS do Storage não tem regex robusto,
-- pelo menos exige que o bucket e o prefixo estejam corretos.
DROP POLICY IF EXISTS "storage: candidates upload" ON storage.objects;

CREATE POLICY "storage: job-applications insert"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'job-applications'
    AND (
        -- Path gerado pela EF: resumes/{id}/...
        name LIKE 'resumes/%/%'
        OR
        -- Path espontâneo
        name LIKE 'resumes/spontaneous/%/%'
    )
);

-- 3. Bucket avatars: remover INSERT aberto e exigir path do próprio usuário
-- (reforço da migration 072 que já tentou fazer isso)
DROP POLICY IF EXISTS "avatars insert" ON storage.objects;

CREATE POLICY "avatars insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
