-- 🚀 MIGRAÇÃO: CRIAÇÃO DA TABELA DE ORGANIZAÇÕES
-- Consolida o sistema de Multi-tenancy criando a entidade de Organização.

-- 1. Criar a tabela oficial de Organizações
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Migrar dados existentes da tabela profiles
-- Pegamos todos os IDs e Nomes de organizações que já foram usados pelos usuários
INSERT INTO public.organizations (id, name)
SELECT DISTINCT organization_id, COALESCE(organization_name, 'Empresa sem Nome')
FROM public.profiles
WHERE organization_id IS NOT NULL
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 3. Habilitar RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Segurança (RLS)
-- Owner pode ver TODAS as organizações
CREATE POLICY "orgs: owner full" ON organizations FOR ALL
    USING ( (SELECT user_role FROM profiles WHERE id = auth.uid()) = 'owner' )
    WITH CHECK ( (SELECT user_role FROM profiles WHERE id = auth.uid()) = 'owner' );

-- Gestores e RH podem ver APENAS a própria organização
CREATE POLICY "orgs: members see own" ON organizations FOR SELECT
    USING ( id = (SELECT organization_id FROM profiles WHERE id = auth.uid()) );

-- 5. Atualizar Vagas (vagas_white_label) para garantir que tenham organization_id
-- (Opcional, mas garante consistência se algo mudou)
UPDATE vagas_white_label v
SET organization_id = p.organization_id
FROM profiles p
WHERE v.user_id = p.id AND v.organization_id IS NULL;
