-- 030_add_job_category.sql
-- Adiciona campo de categoria/área para facilitar filtragem no portal de carreiras

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vagas_white_label' AND column_name = 'category'
    ) THEN
        ALTER TABLE vagas_white_label ADD COLUMN category TEXT DEFAULT 'Outros';
        COMMENT ON COLUMN vagas_white_label.category IS 'Área ou departamento da vaga (ex: Desenvolvimento, Designer, Marketing, Vendas)';
    END IF;
END $$;

-- Garantir que a view public_vagas seja atualizada corretamente
DROP VIEW IF EXISTS public_vagas CASCADE;

CREATE OR REPLACE VIEW public_vagas AS
SELECT 
    id, 
    public_hash, 
    title, 
    description,
    category, -- Novo campo
    has_salary_range, 
    salary_min, 
    salary_max, 
    salary_currency,
    contract_type, 
    has_location, 
    location, 
    work_model,
    work_regime,
    is_pcd,
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
