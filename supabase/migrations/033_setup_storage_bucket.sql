-- Migração 033: Criar Bucket de Armazenamento e Políticas de RLS
-- 1. Criar o bucket organizations se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('organizations', 'organizations', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de RLS para o bucket organizations
-- Permitir leitura pública para que o portal de carreiras funcione
CREATE POLICY "Leitura Pública para Organizations" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'organizations');

-- Permitir que membros de uma organização façam upload apenas para sua própria pasta
-- O caminho do arquivo deve começar com o ID da organização
CREATE POLICY "Membros da Org podem fazer Upload" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'organizations' AND 
    (storage.foldername(name))[1] = (SELECT organization_id::text FROM profiles WHERE id = auth.uid())
);

-- Permitir que membros deletem seus próprios arquivos
CREATE POLICY "Membros da Org podem Deletar" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'organizations' AND 
    (storage.foldername(name))[1] = (SELECT organization_id::text FROM profiles WHERE id = auth.uid())
);
