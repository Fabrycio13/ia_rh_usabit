-- LIMPAR TABELAS ERRADAS E CRIAR SISTEMA VAGAS CORRETO
-- Execute isso no Supabase SQL Editor

-- ============================================
-- 1. LIMPAR TABELAS ERRADAS
-- ============================================
DROP TABLE IF EXISTS vagas_applications CASCADE;
DROP TABLE IF EXISTS vagas_white_label CASCADE;
DROP TABLE IF EXISTS vagas CASCADE;
DROP TABLE IF EXISTS vagas_candidaturas CASCADE;
DROP VIEW IF EXISTS public_vagas CASCADE;
DROP VIEW IF EXISTS public_vagas_white_label CASCADE;

-- ============================================
-- 2. CRIAR TABELA DE VAGAS (sistema dedicado)
-- ============================================
CREATE TABLE vagas_white_label (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Hash público para link compartilhável
    public_hash TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    is_active BOOLEAN DEFAULT true,
    
    -- Informações básicas da vaga
    title TEXT NOT NULL,
    description TEXT,
    
    -- Remuneração
    has_salary_range BOOLEAN DEFAULT false,
    salary_min NUMERIC(10, 2),
    salary_max NUMERIC(10, 2),
    salary_currency TEXT DEFAULT 'BRL',
    
    -- Tipo de contrato
    contract_type TEXT,
    
    -- Localização
    has_location BOOLEAN DEFAULT false,
    location TEXT,
    work_model TEXT,
    
    -- Conteúdo da vaga
    responsibilities TEXT,
    requirements TEXT,
    differentials TEXT,
    additional_info TEXT,
    
    -- White label
    company_name TEXT,
    company_logo TEXT,
    application_deadline TIMESTAMP WITH TIME ZONE,
    max_applications INTEGER,
    
    -- Controle de candidaturas
    application_count INTEGER DEFAULT 0,
    is_accepting_applications BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX idx_vwl_user_id ON vagas_white_label(user_id);
CREATE INDEX idx_vwl_public_hash ON vagas_white_label(public_hash);
CREATE INDEX idx_vwl_is_active ON vagas_white_label(is_active);
CREATE INDEX idx_vwl_created_at ON vagas_white_label(created_at DESC);

-- ============================================
-- 3. CRIAR TABELA DE CANDIDATURAS (vagas_candidaturas)
-- ============================================
CREATE TABLE vagas_candidaturas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vaga_id UUID REFERENCES vagas_white_label(id) ON DELETE CASCADE,
    
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
    
    -- Respostas personalizadas
    answers JSONB,
    
    -- Status
    status TEXT DEFAULT 'pending',
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

-- Índices
CREATE INDEX idx_vc_vaga_id ON vagas_candidaturas(vaga_id);
CREATE INDEX idx_vc_email ON vagas_candidaturas(candidate_email);
CREATE INDEX idx_vc_status ON vagas_candidaturas(status);
CREATE INDEX idx_vc_applied_at ON vagas_candidaturas(applied_at DESC);

-- ============================================
-- 4. TRIGGERS
-- ============================================

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_vwl_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vagas_white_label_updated_at
    BEFORE UPDATE ON vagas_white_label
    FOR EACH ROW
    EXECUTE FUNCTION update_vwl_updated_at_column();

-- Trigger contador de candidaturas
CREATE OR REPLACE FUNCTION increment_vaga_application_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE vagas_white_label 
    SET application_count = application_count + 1 
    WHERE id = NEW.vaga_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_vaga_app_count
    AFTER INSERT ON vagas_candidaturas
    FOR EACH ROW
    EXECUTE FUNCTION increment_vaga_application_count();

-- ============================================
-- 5. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE vagas_white_label ENABLE ROW LEVEL SECURITY;
ALTER TABLE vagas_candidaturas ENABLE ROW LEVEL SECURITY;

-- POLITICAS: vagas_white_label

-- Donos veem TODAS as suas vagas
CREATE POLICY "Donos veem suas vagas" ON vagas_white_label 
    FOR SELECT USING (auth.uid() = user_id);

-- Donos criam vagas
CREATE POLICY "Donos criam vagas" ON vagas_white_label 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Donos editam suas vagas
CREATE POLICY "Donos editam suas vagas" ON vagas_white_label 
    FOR UPDATE USING (auth.uid() = user_id);

-- Donos deletam suas vagas
CREATE POLICY "Donos deletam suas vagas" ON vagas_white_label 
    FOR DELETE USING (auth.uid() = user_id);

-- QUALQUER PESSOA pode ver vagas ativas (white label - candidatos não logados)
CREATE POLICY "Vagas ativas publicas" ON vagas_white_label 
    FOR SELECT USING (is_active = true AND is_accepting_applications = true);

-- POLITICAS: vagas_candidaturas

-- CANDIDATOS podem se candidatar (INSERT público)
CREATE POLICY "Candidaturas publicas" ON vagas_candidaturas 
    FOR INSERT WITH CHECK (true);

-- DONOS DA VAGA veem candidaturas
CREATE POLICY "Donos veem candidaturas" ON vagas_candidaturas 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM vagas_white_label 
            WHERE vagas_white_label.id = vagas_candidaturas.vaga_id 
            AND vagas_white_label.user_id = auth.uid()
        )
    );

-- DONOS DA VAGA atualizam status das candidaturas
CREATE POLICY "Donos atualizam candidaturas" ON vagas_candidaturas 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM vagas_white_label 
            WHERE vagas_white_label.id = vagas_candidaturas.vaga_id 
            AND vagas_white_label.user_id = auth.uid()
        )
    );

-- ============================================
-- 6. VIEW: Vagas públicas (para consulta rápida)
-- ============================================
CREATE OR REPLACE VIEW public_vagas AS
SELECT 
    id, 
    public_hash, 
    title, 
    description,
    has_salary_range, 
    salary_min, 
    salary_max, 
    salary_currency,
    contract_type, 
    has_location, 
    location, 
    work_model,
    responsibilities, 
    requirements, 
    differentials, 
    additional_info,
    company_name, 
    company_logo, 
    application_deadline,
    application_count, 
    is_accepting_applications,
    created_at, 
    published_at
FROM vagas_white_label
WHERE is_active = true AND is_accepting_applications = true;

-- ============================================
-- 7. VERIFICAR TABELAS CRIADAS
-- ============================================
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
