-- ============================================
-- 063: STORAGE POLICIES PARA BUCKET "avatars"
-- O bucket ja existe (publico, 50MB, any MIME)
-- Apenas faltam as RLS policies para permitir
-- upload/update/delete pelo dono do avatar
-- Path: {userId}/avatar.{ext}
-- ============================================

-- 1. INSERT: usuario pode fazer upload no proprio folder
DROP POLICY IF EXISTS "storage: users upload own avatar" ON storage.objects;
CREATE POLICY "storage: users upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. UPDATE: usuario pode atualizar o proprio avatar (upsert)
DROP POLICY IF EXISTS "storage: users update own avatar" ON storage.objects;
CREATE POLICY "storage: users update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. DELETE: usuario pode deletar o proprio avatar
DROP POLICY IF EXISTS "storage: users delete own avatar" ON storage.objects;
CREATE POLICY "storage: users delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
