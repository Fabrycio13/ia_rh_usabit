-- ============================================
-- 067: STATUS PENDENTE PARA USUÁRIOS CONVIDADOS
-- profiles.status = 'pending' até criar senha
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    target_role TEXT;
    target_org_id UUID;
    target_org_name TEXT;
    raw_org_id TEXT;
BEGIN
    -- 1. Extrair e validar o papel (Role)
    target_role := COALESCE(new.raw_user_meta_data->>'user_role', 'owner');
    
    -- 2. Extrair ID da organização com segurança
    raw_org_id := new.raw_user_meta_data->>'organization_id';
    
    IF raw_org_id IS NULL OR raw_org_id = '' OR raw_org_id = 'null' THEN
        target_org_id := NULL;
    ELSE
        BEGIN
            target_org_id := raw_org_id::uuid;
        EXCEPTION WHEN OTHERS THEN
            target_org_id := NULL;
        END;
    END IF;

    -- 3. Extrair Nome da organização
    target_org_name := COALESCE(new.raw_user_meta_data->>'organization_name', 'Minha Organização');

    -- 4. Inserção Principal
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
        'pending',
        'trial',
        target_org_name,
        target_org_id,
        FALSE,
        NOW()
    );

    RETURN new;

EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.profiles (id, email, name, user_role, status)
    VALUES (new.id, new.email, '', COALESCE(target_role, 'owner'), 'pending');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
