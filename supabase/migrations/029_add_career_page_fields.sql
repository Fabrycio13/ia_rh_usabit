-- Migração 029: Adicionar campos de personalização da Página de Carreiras na tabela organizations

-- 1. Adicionar colunas de personalização
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS about_text TEXT;

-- 2. Adicionar política de UPDATE para Gestor/RH poderem atualizar sua própria organização
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organizations' 
        AND policyname = 'orgs: members update own'
    ) THEN
        CREATE POLICY "orgs: members update own" ON public.organizations FOR UPDATE
            USING ( id = (SELECT organization_id FROM profiles WHERE id = auth.uid()) )
            WITH CHECK ( id = (SELECT organization_id FROM profiles WHERE id = auth.uid()) );
    END IF;
END $$;

-- 3. Adicionar política SELECT pública para a tabela organizations
-- Isso é necessário para que a página de carreiras (pública) possa carregar o logo e a cor da empresa.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organizations' 
        AND policyname = 'orgs: public read'
    ) THEN
        CREATE POLICY "orgs: public read" ON public.organizations FOR SELECT
            USING (true);
    END IF;
END $$;
