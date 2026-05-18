-- 1. Adiciona a coluna para saber se o usuário já viu o tutorial
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- 2. Atualiza a função de criação de novos usuários (Gatilho)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    target_role TEXT;
    target_org_id UUID;
    target_org_name TEXT;
BEGIN
    -- Detecta o papel do usuário (Padrão: gestor se for signup público)
    target_role := COALESCE(new.raw_user_meta_data->>'user_role', 'owner');
    
    -- Para Gestores/Owners novos, começamos com organização VAZIA (NULL)
    -- Eles criarão no primeiro login (Tutorial)
    IF target_role IN ('owner', 'gestor') THEN
        target_org_id := (new.raw_user_meta_data->>'organization_id')::uuid; -- Pode ser NULL
        target_org_name := new.raw_user_meta_data->>'organization_name';     -- Pode ser NULL
    ELSE
        -- Para RH e Convidados, herdam obrigatoriamente de quem os criou
        target_org_id := (new.raw_user_meta_data->>'organization_id')::uuid;
        target_org_name := new.raw_user_meta_data->>'organization_name';
    END IF;

    INSERT INTO public.profiles (
        id, 
        email, 
        name, 
        user_role, 
        status, 
        account_type, 
        organization_name, 
        organization_id,
        onboarding_completed,
        created_at
    )
    VALUES (
        new.id, 
        new.email, 
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
        target_role,
        'active',
        'trial',
        target_org_name,
        target_org_id,
        FALSE, -- Sempre começa como FALSE para ver o tutorial
        NOW()
    );
    RETURN new;
EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.profiles (id, email, name, user_role, status, organization_id)
    VALUES (new.id, new.email, '', 'owner', 'active', gen_random_uuid());
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
