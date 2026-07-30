-- H-07: get_my_role retorna NULL se status = 'inactive'
-- Usuários inativos não passam em nenhuma RLS policy que use get_my_role()
-- Usuários pending continuam funcionando (fluxo de invite/cadastro)
-- A policy "profiles: own" (auth.uid() = id) não é afetada

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT CASE
        WHEN status = 'inactive' THEN NULL
        ELSE COALESCE(user_role, 'owner')
    END
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1;
$$;
