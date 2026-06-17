-- Migration: create_rate_limits
-- Purpose: Tabela genérica para rate limiting em Edge Functions
-- Usada por: openai-proxy, submit-candidate, submit-application, email EFs

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON public.rate_limits(key, endpoint, window_start);

-- RLS: Edge Functions usam service_role key (bypass RLS)
-- Nenhum acesso direto do client anon/authenticated
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Política: bloquear tudo (somente service_role acessa)
DROP POLICY IF EXISTS "rate_limits: deny all" ON public.rate_limits;
CREATE POLICY "rate_limits: deny all" ON public.rate_limits
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Função auxiliar para limpar entradas expiradas (pode ser chamada por cron se necessário)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits(older_than_minutes INTEGER DEFAULT 60)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.rate_limits
  WHERE created_at < (now() - (older_than_minutes || ' minutes')::INTERVAL);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_rate_limits(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limits(INTEGER) TO service_role;
