-- ============================================================
-- 100: Fechar escalada de privilégio em profiles (P0-1 do pentest)
--
-- Problema: policy 'profiles: own' (ALL) + GRANT UPDATE table-level
-- para authenticated permitia que qualquer usuário logado fizesse
--   PATCH /rest/v1/profiles?id=<seu_id>  {"user_role": "owner"}
-- e virasse owner (escalada máxima).
--
-- Fix (3 camadas):
--   1. REVOKE UPDATE table-level de authenticated/anon
--   2. GRANT UPDATE apenas nas colunas seguras usadas pelo frontend
--   3. RPC SECURITY DEFINER activate_my_pending_profile() — ativa o
--      próprio perfil (pending → active) SEM UPDATE direto de status
--      (o SetPassword.tsx já chamava essa RPC; ela nunca existia no
--      banco → fluxo de convite quebrado; este fix conserta ambos)
--   4. Trigger anti-escalada (defesa em profundidade: bloqueia UPDATE
--      de colunas privilegiadas por qualquer caminho que não seja a
--      RPC/serviço)
-- ============================================================

-- ─── 1. Revogar UPDATE table-level ────────────────────────────
REVOKE UPDATE ON public.profiles FROM authenticated;
REVOKE UPDATE ON public.profiles FROM anon;

-- ─── 2. Grant UPDATE por coluna (somente o que o frontend usa) ─
GRANT UPDATE (
    name,
    role,
    organization_name,
    phone,
    address,
    brand_name,
    brand_color,
    brand_font,
    avatar_url,
    notifications_enabled,
    onboarding_completed,
    evolution_api_url,
    evolution_api_key,
    evolution_instance,
    updated_at
) ON public.profiles TO authenticated;

-- ─── 3. RPC de ativação do próprio perfil ─────────────────────
-- Conserta o fluxo de convite (SetPassword.tsx:79 chama esta RPC,
-- que nunca existiu) e dá o caminho seguro pending → active.
CREATE OR REPLACE FUNCTION public.activate_my_pending_profile()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated integer;
BEGIN
    UPDATE public.profiles
       SET status = 'active'
     WHERE id = auth.uid()
       AND status = 'pending';

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_my_pending_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_my_pending_profile() TO authenticated;

-- ─── 4. Trigger anti-escalada (defesa em profundidade) ─────────
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- service_role (EFs/backend) e a RPC de ativação passam.
    -- A RPC roda como SECURITY DEFINER do owner (postgres), então
    -- auth.role() = 'service_role' é falso; usamos a flag de sessão.
    IF current_setting('app.allow_profile_activation', true) = '1' THEN
        RETURN NEW;
    END IF;

    IF auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Bloquear mudança de colunas privilegiadas por qualquer outro caminho
    IF NEW.user_role IS DISTINCT FROM OLD.user_role
       OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.account_type IS DISTINCT FROM OLD.account_type
       OR NEW.id IS DISTINCT FROM OLD.id
    THEN
        RAISE EXCEPTION 'Alteração de colunas privilegiadas do perfil não é permitida';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- A RPC precisa sinalizar a ativação legítima para o trigger
CREATE OR REPLACE FUNCTION public.activate_my_pending_profile()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated integer;
BEGIN
    PERFORM set_config('app.allow_profile_activation', '1', true);

    UPDATE public.profiles
       SET status = 'active'
     WHERE id = auth.uid()
       AND status = 'pending';

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_my_pending_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_my_pending_profile() TO authenticated;
