-- Migração 034: Adicionar campo de imagem de fundo da página
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS page_background_url TEXT;
