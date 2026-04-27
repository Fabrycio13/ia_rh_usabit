-- Adicionar campos de Gênero e Idade na tabela de candidaturas
ALTER TABLE vagas_candidaturas 
ADD COLUMN IF NOT EXISTS candidate_gender TEXT,
ADD COLUMN IF NOT EXISTS candidate_age TEXT;

-- Comentários para documentação
COMMENT ON COLUMN vagas_candidaturas.candidate_gender IS 'Gênero do candidato (opcional)';
COMMENT ON COLUMN vagas_candidaturas.candidate_age IS 'Idade do candidato (opcional)';
