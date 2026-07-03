-- ============================================
-- 081: CORRIGIR TRIGGER increment_vaga_app_count
-- O trigger antigo só disparava em INSERT.
-- "Tacar pra vaga" (Pool → Gestão) faz UPDATE vaga_id NULL → NOT NULL,
-- então o contador nunca incrementava nesse fluxo.
--
-- Agora: AFTER INSERT OR UPDATE OF vaga_id
--   - INSERT com vaga_id NOT NULL → incrementa
--   - UPDATE NULL → NOT NULL (Pool → Gestão) → incrementa
--   - UPDATE NOT NULL → NOT NULL (troca de vaga) → NÃO incrementa (já contado)
--   - INSERT/UPDATE com vaga_id NULL (Pool) → NÃO incrementa
-- ============================================

-- ─── 1. RECRIAR FUNÇÃO ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_vaga_application_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Pool (vaga_id NULL): nunca incrementa
    IF NEW.vaga_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- UPDATE: só incrementa se vaga_id mudou de NULL para NOT NULL (Pool → Gestão)
    IF TG_OP = 'UPDATE' AND OLD.vaga_id IS NOT NULL THEN
        RETURN NEW;  -- já estava em uma vaga, não incrementa de novo
    END IF;

    -- INSERT ou UPDATE (NULL → NOT NULL): incrementa
    UPDATE public.vagas_white_label
    SET application_count = application_count + 1
    WHERE id = NEW.vaga_id;

    RETURN NEW;
END $$;

-- ─── 2. RECRIAR TRIGGER ────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS increment_vaga_app_count ON public.vagas_candidaturas;

CREATE TRIGGER increment_vaga_app_count
    AFTER INSERT OR UPDATE OF vaga_id ON public.vagas_candidaturas
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_vaga_application_count();

-- ─── 3. BACKFILL: corrigir contagem de vagas existentes ────────────────────────
-- Candidaturas que foram movidas do Pool para Gestão enquanto o trigger
-- só olhava INSERT ficaram sem incrementar o contador.
UPDATE public.vagas_white_label vw
SET application_count = (
    SELECT COUNT(*)
    FROM public.vagas_candidaturas vc
    WHERE vc.vaga_id = vw.id
)
WHERE EXISTS (
    SELECT 1 FROM public.vagas_candidaturas vc
    WHERE vc.vaga_id = vw.id
);

-- ============================================
-- FIM
-- ============================================
