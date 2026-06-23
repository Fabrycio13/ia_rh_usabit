-- ============================================
-- 064: FIX STORAGE POLICIES PARA BUCKET "avatars"
-- Remove policies anteriores e cria versao mais simples
-- Apenas verifica que usuario esta autenticado
-- ============================================

-- 1. Limpa policies existentes
DROP POLICY IF EXISTS "storage: users upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "storage: users update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "storage: users delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "storage: public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "avatars insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars update" ON storage.objects;
DROP POLICY IF EXISTS "avatars delete" ON storage.objects;
DROP POLICY IF EXISTS "avatars select" ON storage.objects;

-- 2. Policies simples - apenas exige autenticacao e bucket correto
-- INSERT: qualquer usuario autenticado pode fazer upload
CREATE POLICY "avatars insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- 3. UPDATE: qualquer usuario autenticado pode atualizar
CREATE POLICY "avatars update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- 4. DELETE: qualquer usuario autenticado pode deletar
CREATE POLICY "avatars delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

-- 5. SELECT: bucket e publico, mas mantem policy para garantir
-- (Nao e estritamente necessario porque bucket e public, mas defensivo)
DROP POLICY IF EXISTS "avatars select" ON storage.objects;
CREATE POLICY "avatars select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
