-- Migração 036: Refinar opções de PcD em vagas_white_label
-- Altera a coluna is_pcd de BOOLEAN para TEXT para suportar mais opções

-- 1. Remover a view primeiro para permitir a alteração de tipo na coluna dependente
DROP VIEW IF EXISTS public_vagas CASCADE;

-- 2. Alterar tipo da coluna is_pcd
-- Mapeamento: TRUE -> 'exclusive', FALSE -> 'no'
ALTER TABLE vagas_white_label 
ALTER COLUMN is_pcd TYPE TEXT 
USING (CASE WHEN is_pcd THEN 'exclusive' ELSE 'no' END);

-- 3. Adicionar comentário explicativo
COMMENT ON COLUMN vagas_white_label.is_pcd IS 'Tipo de acessibilidade: no (normal), exclusive (apenas PcD), inclusive (também para PcD)';

-- 4. Garantir valor default
ALTER TABLE vagas_white_label ALTER COLUMN is_pcd SET DEFAULT 'no';

-- 5. Recriar a view public_vagas refletindo a mudança de tipo
CREATE OR REPLACE VIEW public_vagas AS
SELECT 
    id, 
    public_hash, 
    title, 
    description,
    category,
    has_salary_range, 
    salary_min, 
    salary_max, 
    salary_currency,
    contract_type, 
    has_location, 
    location, 
    work_model,
    work_regime,
    is_pcd, -- Agora é TEXT
    responsibilities, 
    requirements, 
    differentials, 
    additional_info,
    company_name, 
    company_logo, 
    application_deadline,
    application_count, 
    is_accepting_applications,
    organization_id,
    created_at, 
    published_at
FROM vagas_white_label
WHERE is_active = true AND is_accepting_applications = true;
