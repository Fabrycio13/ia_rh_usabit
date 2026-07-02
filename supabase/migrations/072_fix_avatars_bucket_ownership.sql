-- ============================================
-- 072: Fix avatars bucket — restore folder-ownership RLS
-- Migration 064 removed ownership checks, allowing any
-- authenticated user to overwrite any avatar.
-- This restores the v1 pattern: (storage.foldername(name))[1] = auth.uid()::text
-- ============================================

DROP POLICY IF EXISTS "avatars insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars update" ON storage.objects;
DROP POLICY IF EXISTS "avatars delete" ON storage.objects;

-- INSERT: usuario pode fazer upload APENAS no proprio folder
CREATE POLICY "avatars insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- UPDATE: usuario pode atualizar APENAS o proprio avatar
CREATE POLICY "avatars update"
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

-- DELETE: usuario pode deletar APENAS o proprio avatar
CREATE POLICY "avatars delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
