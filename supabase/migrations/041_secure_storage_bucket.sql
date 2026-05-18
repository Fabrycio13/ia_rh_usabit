-- ============================================
-- 041: STORAGE HARDENING - PROTEÇÃO DE PII
-- Torna o bucket privado e restringe leitura a recrutadores autorizados
-- ============================================

-- 1. Tornar o bucket PRIVADO
UPDATE storage.buckets 
SET public = false 
WHERE id = 'job-applications';

-- 2. Limpar polícias antigas e vulneráveis
DROP POLICY IF EXISTS "Leitura Pública currículos" ON storage.objects;
DROP POLICY IF EXISTS "Upload Público de Currículos" ON storage.objects;

-- 3. Nova Política de INSERT (Upload)
-- Permite que qualquer pessoa faça upload no bucket job-applications
-- (Necessário para o formulário público do candidato)
CREATE POLICY "storage: candidates upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'job-applications');

-- 4. Nova Política de SELECT (Leitura Protegida)
-- Restringe a leitura aos recrutadores da mesma organização da vaga
CREATE POLICY "storage: recruiter access"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'job-applications'
    AND (
        -- Owner tem acesso total
        (public.get_my_role() = 'owner')
        OR
        -- Gestores/RH veem apenas arquivos de suas próprias vagas
        EXISTS (
            SELECT 1 FROM public.vagas_white_label v
            WHERE v.id::text = split_part(name, '/', 2) -- Extrai UUID da vaga do caminho
              AND (
                  v.organization_id = public.get_my_org_id() 
                  OR v.user_id = auth.uid()
              )
        )
    )
);

-- 5. Política de DELETE (Gestão)
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
    )
);
