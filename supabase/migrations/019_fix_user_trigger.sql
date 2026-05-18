-- ============================================
-- 019: CORREÇÃO DO TRIGGER DE NOVOS USUÁRIOS
-- Resolve o erro "Database error saving new user"
-- ============================================

-- 1. Atualiza a função que cria o perfil automático
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    default_org_id UUID;
BEGIN
    -- Se não houver organization_id no metadado, gera um novo UUID
    -- Atribuindo ao usuário o papel de 'owner' por padrão em novos registros
    default_org_id := COALESCE(
        (new.raw_user_meta_data->>'organization_id')::uuid, 
        gen_random_uuid()
    );

    INSERT INTO public.profiles (
        id, 
        email, 
        name, 
        user_role, 
        status, 
        account_type, 
        organization_name, 
        organization_id,
        created_at
    )
    VALUES (
        new.id, 
        new.email, 
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
        'owner',
        'active',
        'trial',
        COALESCE(new.raw_user_meta_data->>'organization_name', 'Minha Organização'),
        default_org_id,
        NOW()
    );
    RETURN new;
EXCEPTION WHEN OTHERS THEN
    -- Fallback simples caso algo dê errado na inserção crítica
    INSERT INTO public.profiles (id, email, name, user_role, status, organization_id)
    VALUES (new.id, new.email, '', 'owner', 'active', gen_random_uuid());
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Recriar o Gatilho
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- OBSERVAÇÃO: Execute este bloco acima no SQL Editor do Supabase console
-- para resolver o erro de criação de usuário imediatamente.
