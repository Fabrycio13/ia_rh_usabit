-- ============================================
-- LIMPAR USUÁRIOS NÃO CONFIRMADOS APÓS 3 DIAS
-- ============================================

-- 1. Função para marcar usuários não confirmados como inativos
-- (rodar manualmente ou via cron job)
CREATE OR REPLACE FUNCTION deactivate_unconfirmed_users()
RETURNS void AS $$
BEGIN
    -- Marcar como inativo usuários não confirmados após 3 dias
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
        raw_user_meta_data,
        '{status}',
        '"inactive"'
    )
    WHERE email_confirmed_at IS NULL
    AND created_at < NOW() - INTERVAL '3 days';
    
    RAISE NOTICE 'Usuários não confirmados marcados como inativos';
END;
$$ LANGUAGE plpgsql;

-- 2. Função para deletar usuários não confirmados após 7 dias
-- (rodar manualmente ou via cron job)
CREATE OR REPLACE FUNCTION cleanup_unconfirmed_users()
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Contar quantos serão deletados
    SELECT COUNT(*) INTO deleted_count
    FROM auth.users
    WHERE email_confirmed_at IS NULL
    AND created_at < NOW() - INTERVAL '7 days';
    
    -- Deletar perfis primeiro (CASCADE vai deletar auth.users)
    DELETE FROM profiles
    WHERE id IN (
        SELECT id FROM auth.users
        WHERE email_confirmed_at IS NULL
        AND created_at < NOW() - INTERVAL '7 days'
    );
    
    -- Deletar usuários do auth
    DELETE FROM auth.users
    WHERE email_confirmed_at IS NULL
    AND created_at < NOW() - INTERVAL '7 days';
    
    RAISE NOTICE 'Usuários não confirmados deletados: %', deleted_count;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 3. View para monitorar usuários pendentes
CREATE OR REPLACE VIEW pending_users AS
SELECT 
    u.id,
    u.email,
    u.created_at,
    u.email_confirmed_at,
    p.name,
    p.user_role,
    p.status,
    EXTRACT(DAY FROM NOW() - u.created_at)::integer as days_pending
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email_confirmed_at IS NULL
ORDER BY u.created_at DESC;

-- 4. Verificar usuários pendentes
SELECT * FROM pending_users;
