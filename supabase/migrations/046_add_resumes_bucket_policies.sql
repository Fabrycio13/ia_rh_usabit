-- ============================================
-- 046: RESUMES BUCKET & RLS POLICIES
-- Cria o bucket 'resumes' e define políticas de acesso para o fluxo de análise
-- ============================================

-- 1. Criar o bucket 'resumes' se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Política de INSERT (Upload)
-- Permite que usuários autenticados (recrutadores) façam upload no bucket resumes
CREATE POLICY "storage: recruiters upload resumes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resumes');

-- 3. Política de SELECT (Leitura)
-- Permite que recrutadores leiam arquivos no bucket resumes
-- O acesso real é via Signed URL, mas a política SELECT é necessária para o Supabase gerar a URL
CREATE POLICY "storage: recruiters select resumes"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'resumes');

-- 4. Política de DELETE (Gestão)
CREATE POLICY "storage: recruiters delete resumes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'resumes');

-- 5. Adicionar coluna resume_file_name à tabela candidates se não existir
ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS resume_file_name TEXT;
