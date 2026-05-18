ALTER TABLE vagas_white_label 
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS company_logo TEXT,
ADD COLUMN IF NOT EXISTS show_company_name BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_third_party BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN vagas_white_label.company_name IS 'Nome da empresa cliente (ex: Mileto) para recrutamento terceirizado';
COMMENT ON COLUMN vagas_white_label.company_logo IS 'URL da logo da empresa cliente para branding no portal público';
COMMENT ON COLUMN vagas_white_label.show_company_name IS 'Controla se o nome/logo da empresa aparece no portal público (Confidencialidade)';
COMMENT ON COLUMN vagas_white_label.is_third_party IS 'Flag que identifica se a vaga está sendo trabalhada para um cliente externo (RPO)';
