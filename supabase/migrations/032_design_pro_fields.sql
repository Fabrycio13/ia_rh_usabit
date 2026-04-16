-- Migração 032: Adicionar campos avançados de design (Fontes e Espaçamento)
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'Inter',
ADD COLUMN IF NOT EXISTS header_padding INTEGER DEFAULT 24;

-- Garante que o bucket 'organizations' exista (opcional, pode falhar se não tiver permissão de superuser, mas tentamos)
-- Geralmente é melhor criar via Dashboard, mas deixamos as colunas prontas.
