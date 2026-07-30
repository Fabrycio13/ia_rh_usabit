-- ============================================
-- 085: Políticas de SELECT faltantes e separação de buckets
-- Adiciona SELECT policy para avatars (público para leitura)
-- e remove política obsoleta do bucket resumes (INSERT já removido na 084)
-- ============================================

-- 1. Bucket avatars: política de SELECT
-- Avatars são fotos de perfil — precisam ser legíveis por outros usuários
DROP POLICY IF EXISTS "avatars select" ON storage.objects;
CREATE POLICY "avatars select"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'avatars'
);

-- 2. Bucket resumes: garantir que só leitura de arquivos antigos funciona
-- (INSERT já removido na migration 084, SELECT existe via migration 071)
-- Apenas garantir que não sobrou policy de INSERT/resumes
DROP POLICY IF EXISTS "resumes insert" ON storage.objects;
