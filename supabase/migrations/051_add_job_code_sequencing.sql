-- Migração 051 (REVISADA): Adicionar Job Code (VA-01, VA-02...) com Sequência Persistente
-- Esta versão garante que se uma vaga for excluída, o número NÃO será reutilizado.

-- 1. Criar tabela de contadores por organização
CREATE TABLE IF NOT EXISTS public.job_code_counters (
    organization_id UUID PRIMARY KEY,
    last_value INTEGER DEFAULT 0
);

-- 2. Adicionar coluna job_code na tabela de vagas
ALTER TABLE public.vagas_white_label 
ADD COLUMN IF NOT EXISTS job_code TEXT;

-- 3. Função para gerar o próximo código (VA-01, VA-02...) persistente
CREATE OR REPLACE FUNCTION generate_vaga_job_code_persistent()
RETURNS TRIGGER AS $$
DECLARE
    next_val INTEGER;
BEGIN
    -- Se já tiver código (ex: import), mantém
    IF NEW.job_code IS NOT NULL AND NEW.job_code != '' THEN
        RETURN NEW;
    END IF;

    -- Tenta obter e incrementar o contador da organização (upsert)
    INSERT INTO public.job_code_counters (organization_id, last_value)
    VALUES (NEW.organization_id, 1)
    ON CONFLICT (organization_id) 
    DO UPDATE SET last_value = job_code_counters.last_value + 1
    RETURNING last_value INTO next_val;

    -- Formata como VA-01, VA-02...
    NEW.job_code := 'VA-' || LPAD(next_val::text, 2, '0');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger para gerar código antes do INSERT
DROP TRIGGER IF EXISTS trg_generate_vaga_job_code ON public.vagas_white_label;
CREATE TRIGGER trg_generate_vaga_job_code
    BEFORE INSERT ON public.vagas_white_label
    FOR EACH ROW
    EXECUTE FUNCTION generate_vaga_job_code_persistent();

-- 5. Popular vagas existentes e inicializar contadores
DO $$ 
DECLARE 
    org RECORD;
    vaga RECORD;
    curr_num INTEGER;
BEGIN
    FOR org IN (SELECT DISTINCT organization_id FROM public.vagas_white_label WHERE organization_id IS NOT NULL) LOOP
        curr_num := 0;
        FOR vaga IN (SELECT id FROM public.vagas_white_label WHERE organization_id = org.organization_id ORDER BY created_at ASC) LOOP
            curr_num := curr_num + 1;
            UPDATE public.vagas_white_label 
            SET job_code = 'VA-' || LPAD(curr_num::text, 2, '0')
            WHERE id = vaga.id AND (job_code IS NULL OR job_code = '');
        END LOOP;
        
        -- Inicializa o contador para esta organização
        INSERT INTO public.job_code_counters (organization_id, last_value)
        VALUES (org.organization_id, curr_num)
        ON CONFLICT (organization_id) DO UPDATE SET last_value = curr_num;
    END LOOP;
END $$;
