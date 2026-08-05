-- ============================================================
-- 095: Decrementar application_count ao excluir/remover candidato da vaga
--
-- Bug: ao excluir uma candidatura (DELETE em vagas_candidaturas)
-- ou tirar o candidato da vaga (UPDATE vaga_id NOT NULL -> NULL),
-- o contador vagas_white_label.application_count nunca decrementa.
-- O trigger da 081 só cobre INSERT e UPDATE NULL -> NOT NULL.
-- Sintoma: candidato some da lista mas "N candidaturas" persiste.
--
-- Fix:
--   1. Função decrement_vaga_application_count() para AFTER DELETE.
--   2. Trigger AFTER DELETE ON vagas_candidaturas.
--   3. Estender a função de incremento (081) para decrementar no
--      UPDATE vaga_id NOT NULL -> NULL (tirar da vaga -> pool).
--   4. Backfill: recalcular application_count de todas as vagas
--      a partir do COUNT real de candidaturas.
-- ============================================================

-- ─── 1. FUNÇÃO DE DECREMENTO (DELETE) ────────────────────────────────
CREATE OR REPLACE FUNCTION public.decrement_vaga_application_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Pool (vaga_id NULL): nunca decrementa
    IF OLD.vaga_id IS NULL THEN
        RETURN OLD;
    END IF;

    UPDATE public.vagas_white_label
    SET application_count = GREATEST(0, application_count - 1)
    WHERE id = OLD.vaga_id;

    RETURN OLD;
END $$;

-- ─── 2. TRIGGER DE DELETE ─────────────────────────────────────────────
DROP TRIGGER IF EXISTS decrement_vaga_app_count ON public.vagas_candidaturas;

CREATE TRIGGER decrement_vaga_app_count
    AFTER DELETE ON public.vagas_candidaturas
    FOR EACH ROW
    EXECUTE FUNCTION public.decrement_vaga_application_count();

-- ─── 3. ESTENDER INCREMENTO (081) PARA "TIRAR DA VAGA" ───────────────
-- UPDATE vaga_id NOT NULL -> NULL (Gestão -> Pool): decrementa.
-- UPDATE vaga_id NOT NULL -> NOT NULL (troca de vaga): não mexe (mantém 081).
-- UPDATE vaga_id NULL -> NOT NULL (Pool -> Gestão): incrementa (mantém 081).
CREATE OR REPLACE FUNCTION public.increment_vaga_application_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Pool (vaga_id NULL) em INSERT/UPDATE NULL->NULL: nunca incrementa
    IF NEW.vaga_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- UPDATE: tirou da vaga (NOT NULL -> NULL) -> decrementa
    IF TG_OP = 'UPDATE' AND OLD.vaga_id IS NOT NULL AND NEW.vaga_id IS NULL THEN
        UPDATE public.vagas_white_label
        SET application_count = GREATEST(0, application_count - 1)
        WHERE id = OLD.vaga_id;
        RETURN NEW;
    END IF;

    -- UPDATE NOT NULL -> NOT NULL (troca de vaga): já contado, não incrementa
    IF TG_OP = 'UPDATE' AND OLD.vaga_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- INSERT ou UPDATE (NULL -> NOT NULL): incrementa
    UPDATE public.vagas_white_label
    SET application_count = application_count + 1
    WHERE id = NEW.vaga_id;

    RETURN NEW;
END $$;

-- Trigger da 081 já cobre INSERT OR UPDATE OF vaga_id — mantém como está.

-- ─── 4. BACKFILL: corrigir contadores desatualizados ─────────────────
UPDATE public.vagas_white_label vw
SET application_count = (
    SELECT COUNT(*)
    FROM public.vagas_candidaturas vc
    WHERE vc.vaga_id = vw.id
);

-- ============================================================
-- FIM
-- ============================================================
