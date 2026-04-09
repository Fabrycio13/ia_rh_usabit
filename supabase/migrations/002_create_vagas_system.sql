-- SISTEMA DE VAGAS WHITE LABEL
-- TABELA SEPARADA - NAO AFETA O SISTEMA DE ANALISE

-- TABELA DE VAGAS
CREATE TABLE IF NOT EXISTS vagas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    public_hash TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    is_active BOOLEAN DEFAULT true,
    title TEXT NOT NULL,
    description TEXT,
    has_salary_range BOOLEAN DEFAULT false,
    salary_min NUMERIC(10, 2),
    salary_max NUMERIC(10, 2),
    salary_currency TEXT DEFAULT 'BRL',
    contract_type TEXT,
    has_location BOOLEAN DEFAULT false,
    location TEXT,
    work_model TEXT,
    responsibilities TEXT,
    requirements TEXT,
    differentials TEXT,
    additional_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    company_name TEXT,
    company_logo TEXT,
    application_deadline TIMESTAMP WITH TIME ZONE,
    max_applications INTEGER,
    application_count INTEGER DEFAULT 0,
    is_accepting_applications BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_vagas_user_id ON vagas(user_id);
CREATE INDEX IF NOT EXISTS idx_vagas_public_hash ON vagas(public_hash);
CREATE INDEX IF NOT EXISTS idx_vagas_is_active ON vagas(is_active);
CREATE INDEX IF NOT EXISTS idx_vagas_created_at ON vagas(created_at DESC);

-- TABELA DE CANDIDATURAS
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vaga_id UUID REFERENCES vagas(id) ON DELETE CASCADE,
    candidate_name TEXT NOT NULL,
    candidate_email TEXT NOT NULL,
    candidate_phone TEXT,
    candidate_linkedin TEXT,
    candidate_location TEXT,
    resume_url TEXT,
    resume_file_name TEXT,
    resume_file_size BIGINT,
    answers JSONB,
    status TEXT DEFAULT 'pending',
    internal_notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    source TEXT DEFAULT 'public_link',
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_applications_vaga_id ON job_applications(vaga_id);
CREATE INDEX IF NOT EXISTS idx_applications_email ON job_applications(candidate_email);
CREATE INDEX IF NOT EXISTS idx_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON job_applications(applied_at DESC);

-- TRIGGER updated_at
CREATE OR REPLACE FUNCTION update_vagas_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vagas_updated_at
    BEFORE UPDATE ON vagas
    FOR EACH ROW
    EXECUTE FUNCTION update_vagas_updated_at_column();

-- TRIGGER contador de candidaturas
CREATE OR REPLACE FUNCTION increment_application_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE vagas SET application_count = application_count + 1 WHERE id = NEW.vaga_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_app_count
    AFTER INSERT ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION increment_application_count();

-- ROW LEVEL SECURITY
ALTER TABLE vagas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios veem suas proprias vagas" ON vagas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios criam vagas" ON vagas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios editam suas proprias vagas" ON vagas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuarios deletam suas proprias vagas" ON vagas FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Vagas ativas sao publicas" ON vagas FOR SELECT USING (is_active = true);

ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Donos veem candidaturas" ON job_applications FOR SELECT USING (EXISTS (SELECT 1 FROM vagas WHERE vagas.id = job_applications.vaga_id AND vagas.user_id = auth.uid()));
CREATE POLICY "Candidaturas publicas" ON job_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Donos atualizam candidaturas" ON job_applications FOR UPDATE USING (EXISTS (SELECT 1 FROM vagas WHERE vagas.id = job_applications.vaga_id AND vagas.user_id = auth.uid()));

-- VIEW publica
CREATE OR REPLACE VIEW public_vagas AS
SELECT id, public_hash, title, description, has_salary_range, salary_min, salary_max, salary_currency, contract_type, has_location, location, work_model, responsibilities, requirements, differentials, additional_info, company_name, company_logo, application_deadline, application_count, is_accepting_applications, created_at, published_at FROM vagas WHERE is_active = true AND is_accepting_applications = true;
