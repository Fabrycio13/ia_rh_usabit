-- ============================================
-- PERMISSÕES HIERÁRQUICAS: Quem pode criar quem
-- ============================================

-- Função para verificar se um usuário pode criar outro com determinado perfil
-- Retorna TRUE se permitido, FALSE se não
CREATE OR REPLACE FUNCTION can_create_role(
    p_creator_role TEXT,      -- Perfil de quem está criando
    p_target_role TEXT,       -- Perfil que deseja criar
    p_creator_is_owner BOOLEAN DEFAULT FALSE,
    p_creator_is_admin BOOLEAN DEFAULT FALSE,
    p_creator_is_gestor BOOLEAN DEFAULT FALSE
) RETURNS BOOLEAN AS $$
BEGIN
    -- Owner pode criar qualquer perfil
    IF p_creator_is_owner THEN
        RETURN TRUE;
    END IF;
    
    -- Admin pode criar Gestores
    IF p_creator_is_admin THEN
        RETURN p_target_role IN ('gestor');
    END IF;
    
    -- Gestor pode criar RH e Convidado
    IF p_creator_is_gestor THEN
        RETURN p_target_role IN ('rh', 'convidado');
    END IF;
    
    -- RH e Convidado não podem criar ninguém
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar se usuário pode ver dados de outro
CREATE OR REPLACE FUNCTION can_view_data(
    p_viewer_org_id UUID,
    p_viewer_role TEXT,
    p_data_org_id UUID,
    p_viewer_id UUID,
    p_data_owner_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- Se organization_id é igual, pode ver
    IF p_viewer_org_id IS NOT NULL AND p_viewer_org_id = p_data_org_id THEN
        RETURN TRUE;
    END IF;
    
    -- Owner (org_id = NULL) pode ver tudo
    IF p_viewer_org_id IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Se não é da mesma org e não é owner, não pode ver
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
