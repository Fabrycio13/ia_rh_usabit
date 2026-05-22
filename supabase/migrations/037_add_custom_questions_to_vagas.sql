-- Adicionar suporte a perguntas personalizadas na jornada do candidato
ALTER TABLE vagas_white_label ADD COLUMN IF NOT EXISTS custom_questions JSONB DEFAULT '[]'::jsonb;

-- Atualizar a view para incluir as perguntas na página pública
DROP VIEW IF EXISTS public_vagas CASCADE;

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
    published_at,
    custom_questions
FROM vagas_white_label
WHERE is_active = true AND is_accepting_applications = true;
