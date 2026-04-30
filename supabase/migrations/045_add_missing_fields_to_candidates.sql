-- ============================================
-- 045: CAMPOS ADICIONAIS PARA CANDIDATOS (BANCO DE TALENTOS)
-- Sincronizar com dados do formulário de candidatura
-- ============================================

ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS age TEXT,
ADD COLUMN IF NOT EXISTS portfolio TEXT,
ADD COLUMN IF NOT EXISTS cep TEXT,
ADD COLUMN IF NOT EXISTS address_number TEXT,
ADD COLUMN IF NOT EXISTS complement TEXT;

-- Comentários para documentação
COMMENT ON COLUMN candidates.gender IS 'Gênero do candidato';
COMMENT ON COLUMN candidates.age IS 'Idade do candidato';
COMMENT ON COLUMN candidates.portfolio IS 'URL do portfólio do candidato';
COMMENT ON COLUMN candidates.cep IS 'CEP do endereço';
COMMENT ON COLUMN candidates.address_number IS 'Número do endereço';
COMMENT ON COLUMN candidates.complement IS 'Complemento do endereço';
