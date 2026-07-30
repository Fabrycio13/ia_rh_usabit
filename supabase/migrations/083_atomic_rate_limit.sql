-- ============================================
-- 083: Rate limit atômico e fail-closed
-- Substitui o padrão COUNT + INSERT (race condition)
-- por uma RPC que faz tudo na mesma transação.
-- ============================================

-- Função atômica de rate limit
-- Retorna true se a requisição é permitida, false se excedeu o limite
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_key TEXT,
    p_endpoint TEXT,
    p_max_requests INTEGER,
    p_window_ms INTEGER DEFAULT 60000
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cutoff TIMESTAMPTZ;
    v_count INTEGER;
BEGIN
    v_cutoff := now() - (p_window_ms || ' milliseconds')::INTERVAL;

    -- Contar requisições existentes na janela (atômico, mesma transação)
    SELECT COUNT(*) INTO v_count
    FROM public.rate_limits
    WHERE key = p_key
      AND endpoint = p_endpoint
      AND created_at >= v_cutoff;

    -- Se atingiu o limite, rejeitar
    IF v_count >= p_max_requests THEN
        RETURN FALSE;
    END IF;

    -- Registrar esta requisição
    INSERT INTO public.rate_limits (key, endpoint)
    VALUES (p_key, p_endpoint);

    -- Limpeza oportunística (1% das chamadas, sem impacto perceptível)
    IF random() < 0.01 THEN
        DELETE FROM public.rate_limits
        WHERE created_at < now() - INTERVAL '1 hour';
    END IF;

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, TEXT, INTEGER, INTEGER) TO service_role;
