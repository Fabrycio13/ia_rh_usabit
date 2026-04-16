-- =====================================================
-- SISTEMA DE VAGAS WHITE LABEL
-- =====================================================
-- Este arquivo contém a criação completa do schema para
-- gerenciamento de vagas e candidaturas
-- =====================================================



-- 2. TABELA DE CANDIDATURAS (job_applications)
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    
    -- Dados do candidato
    candidate_name TEXT NOT NULL,
    candidate_email TEXT NOT NULL,
    candidate_phone TEXT,
    candidate_linkedin TEXT,
    candidate_location TEXT,
    
    -- Currículo
    resume_url TEXT,
    resume_file_name TEXT,
    resume_file_size BIGINT,
    
    -- Respostas personalizadas (JSON flexível)
    answers JSONB,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'shortlisted', 'rejected', 'hired')),
    
    -- Notas internas
    internal_notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    
    -- Timestamps
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    source TEXT DEFAULT 'public_link',
    ip_address INET,
    user_agent TEXT
);

-- Índice para candidaturas
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_email ON job_applications(candidate_email);
CREATE INDEX IF NOT EXISTS idx_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON job_applications(applied_at DESC);

-- Trigger para incrementar contador
CREATE OR REPLACE FUNCTION increment_application_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE jobs 
    SET application_count = application_count + 1
    WHERE id = NEW.job_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_app_count
    AFTER INSERT ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION increment_application_count();

-- 3. POLICY: Row Level Security (RLS)

-- Jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver suas próprias vagas
CREATE POLICY "Usuários veem suas próprias vagas"
    ON jobs FOR SELECT
    USING (auth.uid() = user_id);

-- Usuários podem criar vagas
CREATE POLICY "Usuários criam vagas"
    ON jobs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Usuários podem editar suas próprias vagas
CREATE POLICY "Usuários editam suas próprias vagas"
    ON jobs FOR UPDATE
    USING (auth.uid() = user_id);

-- Usuários podem deletar suas próprias vagas
CREATE POLICY "Usuários deletam suas próprias vagas"
    ON jobs FOR DELETE
    USING (auth.uid() = user_id);

-- Vagas ativas são visíveis publicamente (sem auth)
CREATE POLICY "Vagas ativas são públicas"
    ON jobs FOR SELECT
    USING (is_active = true);

-- Job Applications
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Donos da vaga podem ver candidaturas
CREATE POLICY "Donos veem candidaturas"
    ON job_applications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = job_applications.job_id
            AND jobs.user_id = auth.uid()
        )
    );

-- Qualquer um pode se candidatar (público)
CREATE POLICY "Candidaturas públicas"
    ON job_applications FOR INSERT
    WITH CHECK (true);

-- Donos podem atualizar status
CREATE POLICY "Donos atualizam candidaturas"
    ON job_applications FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = job_applications.job_id
            AND jobs.user_id = auth.uid()
        )
    );

-- 4. FUNCTION: Criar nova vaga com hash automático
CREATE OR REPLACE FUNCTION create_job_with_hash(
    p_user_id UUID,
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_has_salary_range BOOLEAN DEFAULT false,
    p_salary_min NUMERIC DEFAULT NULL,
    p_salary_max NUMERIC DEFAULT NULL,
    p_contract_type TEXT DEFAULT NULL,
    p_has_location BOOLEAN DEFAULT false,
    p_location TEXT DEFAULT NULL,
    p_work_model TEXT DEFAULT NULL,
    p_responsibilities TEXT DEFAULT NULL,
    p_requirements TEXT DEFAULT NULL,
    p_differentials TEXT DEFAULT NULL,
    p_additional_info TEXT DEFAULT NULL
)
RETURNS jobs AS $$
DECLARE
    new_job jobs;
BEGIN
    INSERT INTO jobs (
        user_id, title, description,
        has_salary_range, salary_min, salary_max, contract_type,
        has_location, location, work_model,
        responsibilities, requirements, differentials, additional_info,
        published_at
    ) VALUES (
        p_user_id, p_title, p_description,
        p_has_salary_range, p_salary_min, p_salary_max, p_contract_type,
        p_has_location, p_location, p_work_model,
        p_responsibilities, p_requirements, p_differentials, p_additional_info,
        NOW()
    ) RETURNING * INTO new_job;
    
    RETURN new_job;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. VIEW: Vagas públicas (apenas ativas)
CREATE OR REPLACE VIEW public_jobs AS
SELECT 
    id, public_hash, title, description,
    has_salary_range, salary_min, salary_max, salary_currency,
    contract_type, has_location, location, work_model,
    responsibilities, requirements, differentials, additional_info,
    company_name, company_logo, application_deadline,
    application_count, is_accepting_applications,
    created_at, published_at
FROM jobs
WHERE is_active = true AND is_accepting_applications = true;
